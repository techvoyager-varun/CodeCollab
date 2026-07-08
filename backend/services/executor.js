const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const pidusage = require('pidusage');

const TIMEOUT_MS = 10000; 
const MAX_OUTPUT = 10000; 

const LANGUAGE_CONFIG = {
  javascript: { ext: '.js', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'node', args: [file] }) },
  python: { ext: '.py', buildCmd: null, getSpawn: (file, out) => ({ cmd: os.platform() === 'win32' ? 'python' : 'python3', args: [file] }) },
  typescript: { ext: '.ts', buildCmd: null, getSpawn: (file, out) => ({ cmd: os.platform() === 'win32' ? 'npx.cmd' : 'npx', args: ['ts-node', file] }) },
  ruby: { ext: '.rb', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'ruby', args: [file] }) },
  php: { ext: '.php', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'php', args: [file] }) },
  shell: { ext: '.sh', buildCmd: null, getSpawn: (file, out) => ({ cmd: os.platform() === 'win32' ? 'bash' : 'sh', args: [file] }) },
  go: { ext: '.go', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'go', args: ['run', file] }) },
  c: { ext: '.c', buildCmd: (file, out) => `gcc -O2 "${file}" -o "${out}"`, getSpawn: (file, out) => ({ cmd: out, args: [] }) },
  cpp: { ext: '.cpp', buildCmd: (file, out) => `g++ -O2 -std=c++17 "${file}" -o "${out}"`, getSpawn: (file, out) => ({ cmd: out, args: [] }) },
  java: { ext: '.java', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'java', args: [file] }) },
  rust: { ext: '.rs', buildCmd: (file, out) => `rustc "${file}" -o "${out}"`, getSpawn: (file, out) => ({ cmd: out, args: [] }) },
  swift: { ext: '.swift', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'swift', args: [file] }) },
  perl: { ext: '.pl', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'perl', args: [file] }) },
  r: { ext: '.r', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'Rscript', args: [file] }) },
  scala: { ext: '.scala', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'scala', args: [file] }) },
  haskell: { ext: '.hs', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'runhaskell', args: [file] }) },
  dart: { ext: '.dart', buildCmd: null, getSpawn: (file, out) => ({ cmd: 'dart', args: [file] }) }
};

async function executeCode(language, code, stdin = '') {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { stdout: '', stderr: `Language '${language}' is not supported for execution.`, exitCode: 1, executionTime: 0 };
  }

  const tmpDir = os.tmpdir();
  const fileId = uuidv4();
  const filePath = path.join(tmpDir, `codecollab_${fileId}${config.ext}`);
  const outPath = path.join(tmpDir, `codecollab_${fileId}${os.platform() === 'win32' ? '.exe' : '.out'}`);

  try {
    
    fs.writeFileSync(filePath, code, 'utf8');

    
    if (config.buildCmd) {
      try {
        execSync(config.buildCmd(filePath, outPath), { timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT });
      } catch (buildErr) {
        
        try { fs.unlinkSync(filePath); } catch (e) {  }
        try { fs.unlinkSync(outPath); } catch (e) {  }
        return {
          stdout: '',
          stderr: buildErr.stderr ? buildErr.stderr.toString().slice(0, MAX_OUTPUT) : buildErr.message,
          exitCode: 1,
          executionTime: 0
        };
      }
    }

    const spawnConfig = config.getSpawn(filePath, outPath);
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn(spawnConfig.cmd, spawnConfig.args, {
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=128' },
        timeout: TIMEOUT_MS,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT);
      });

      
      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      } else {
        child.stdin.end();
      }

      let peakMemory = 0;
      const memInterval = setInterval(async () => {
        if (child.pid) {
          try {
            const stats = await pidusage(child.pid);
            if (stats.memory > peakMemory) {
              peakMemory = stats.memory;
            }
          } catch (e) {}
        }
      }, 100);

      
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, TIMEOUT_MS);

      child.on('close', (exitCode) => {
        clearInterval(memInterval);
        try { pidusage.clear(); } catch (e) {}
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;

        
        try { fs.unlinkSync(filePath); } catch (e) {  }
        try { fs.unlinkSync(outPath); } catch (e) {  }

        if (executionTime >= TIMEOUT_MS) {
          resolve({
            stdout: stdout,
            stderr: 'Execution timed out (10s limit).',
            exitCode: 124,
            executionTime,
            memoryUsage: peakMemory
          });
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
          executionTime,
          memoryUsage: peakMemory
        });
      });

      child.on('error', (err) => {
        clearInterval(memInterval);
        try { pidusage.clear(); } catch (e) {}
        clearTimeout(timer);
        const executionTime = Date.now() - startTime;
        try { fs.unlinkSync(filePath); } catch (e) {  }
        try { fs.unlinkSync(outPath); } catch (e) {  }
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          executionTime,
          memoryUsage: 0
        });
      });
    });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch (e) {  }
    try { fs.unlinkSync(outPath); } catch (e) {  }
    return {
      stdout: '',
      stderr: err.message,
      exitCode: 1,
      executionTime: 0
    };
  }
}

module.exports = { executeCode, LANGUAGE_CONFIG };
