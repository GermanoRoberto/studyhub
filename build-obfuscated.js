const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Opções de ofuscação balanceadas para segurança máxima sem quebrar o Node/React
const obfuscatorConfig = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  unicodeEscapeSequence: false
};

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        copyFolderRecursive(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function obfuscateFile(filePath, destPath) {
  console.log(`Ofuscando: ${path.relative(rootDir, filePath)}...`);
  const code = fs.readFileSync(filePath, 'utf8');
  const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, obfuscatorConfig);
  fs.writeFileSync(destPath, obfuscatedResult.getObfuscatedCode(), 'utf8');
}

async function main() {
  console.log("=== INICIANDO CONSTRUÇÃO E OFUSCAÇÃO DO STUDY HUB ===");

  // 1. Limpar dist antiga
  if (fs.existsSync(distDir)) {
    console.log("Limpando pasta dist/ antiga...");
    deleteFolderRecursive(distDir);
  }
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'backend'), { recursive: true });
  fs.mkdirSync(path.join(distDir, 'backend', 'uploads'), { recursive: true });

  // 2. Compilar Frontend
  console.log("Compilando Frontend (npm run build)...");
  try {
    execSync('cmd /c npm run build', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });
  } catch (err) {
    console.error("Erro ao compilar o frontend:", err);
    process.exit(1);
  }

  // 3. Copiar Frontend Compilado para dist/frontend/dist
  console.log("Copiando arquivos compilados do frontend...");
  const frontendSrcDist = path.join(rootDir, 'frontend', 'dist');
  const frontendDestDist = path.join(distDir, 'frontend', 'dist');
  copyFolderRecursive(frontendSrcDist, frontendDestDist);

  // 4. Arquivos JS do Frontend já são minificados e embaralhados nativamente pelo Vite,
  // então não precisam de dupla ofuscação (o que quebraria o ciclo de renderização do React)

  // 5. Ofuscar arquivos JS do Backend
  const backendFilesToObfuscate = ['server.js', 'localDb.js', 'localSummariesDb.js'];
  for (const file of backendFilesToObfuscate) {
    const srcPath = path.join(rootDir, 'backend', file);
    const destPath = path.join(distDir, 'backend', file);
    if (fs.existsSync(srcPath)) {
      obfuscateFile(srcPath, destPath);
    }
  }

  // 6. Copiar arquivos de configuração do Backend e instalar dependências de produção
  console.log("Copiando dependências e recursos do backend...");
  fs.copyFileSync(
    path.join(rootDir, 'backend', 'package.json'),
    path.join(distDir, 'backend', 'package.json')
  );
  fs.copyFileSync(
    path.join(rootDir, 'backend', 'package-lock.json'),
    path.join(distDir, 'backend', 'package-lock.json')
  );

  // Copiar por.traineddata (OCR)
  const traineddataPath = path.join(rootDir, 'por.traineddata');
  if (fs.existsSync(traineddataPath)) {
    console.log("Copiando arquivo de OCR (por.traineddata)...");
    fs.copyFileSync(traineddataPath, path.join(distDir, 'por.traineddata'));
  }

  // Copiar package.json e package-lock.json da raiz
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(distDir, 'package.json'));
  fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(distDir, 'package-lock.json'));

  // Copiar executável portátil do Node.js
  const localNodePath = "C:\\Program Files\\nodejs\\node.exe";
  if (fs.existsSync(localNodePath)) {
    console.log("Copiando executável do Node.js para distribuição portátil...");
    fs.copyFileSync(localNodePath, path.join(distDir, 'node.exe'));
  } else {
    console.warn("ALERTA: node.exe global não encontrado na pasta padrão! Certifique-se de adicioná-lo manualmente ou ter o Node.js no PATH.");
  }

  // Baixar ícone de raio roxo personalizado do IconsDB
  const iconDestPath = path.join(distDir, 'icon.ico');
  console.log("Baixando ícone de raio roxo personalizado do IconsDB...");
  try {
    execSync('powershell -Command "Invoke-WebRequest -Uri \'https://www.iconsdb.com/icons/download/color/863bff/lightning-bolt-256.ico\' -OutFile \'' + iconDestPath + '\'"');
    console.log("Ícone de raio roxo baixado com sucesso!");
  } catch (err) {
    console.warn("Aviso: Falha ao baixar ícone de raio. Usando fallback silencioso...");
  }

  // Instalar dependências de produção na pasta de destino (dist/backend)
  console.log("Instalando dependências de produção (npm install --omit=dev) na pasta de distribuição...");
  try {
    execSync('cmd /c npm install --omit=dev', { cwd: path.join(distDir, 'backend'), stdio: 'inherit' });
  } catch (err) {
    console.error("Erro ao instalar dependências de produção:", err);
    process.exit(1);
  }

  // 7. Criar Inicializador Silencioso Portátil (StudyHub.vbs)
  console.log("Criando script de inicialização silenciosa (StudyHub.vbs)...");
  const vbsContent = `Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(Wscript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir
' Inicia o Node.js portátil local em segundo plano apontando para o backend ofuscado
WshShell.Run """" & scriptDir & "\\node.exe"" """ & scriptDir & "\\backend\\server.js""", 0, false
' Abre o navegador padrão na porta do servidor
WshShell.Run "cmd.exe /c start http://127.0.0.1:5000", 1, false
`;
  fs.writeFileSync(path.join(distDir, 'StudyHub.vbs'), vbsContent, 'utf8');

  // Criar arquivo explicativo README.txt na dist
  const readmeContent = `=== STUDY HUB - INTELIGENCIA E PLANEJAMENTO ATIVO ===

Este e um software livre e open-source de uso pessoal.
Para iniciar a aplicacao:
1. De um duplo clique no arquivo "StudyHub.vbs" (ele iniciara o servidor de forma silenciosa e abrira seu navegador).
2. Caso prefira ver o console do servidor, abra o prompt de comando (CMD) nesta pasta e execute:
   node.exe backend/server.js
   Em seguida abra http://127.0.0.1:5000 no seu navegador.
`;
  fs.writeFileSync(path.join(distDir, 'README.txt'), readmeContent, 'utf8');

  console.log("=== PROCESSO DE BUILD E OFUSCAÇÃO CONCLUÍDO COM SUCESSO! ===");
}

main().catch(console.error);
