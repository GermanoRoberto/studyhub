[Setup]
AppName=Study Hub
AppVersion=1.0.0
WizardStyle=modern
DefaultDirName={localappdata}\StudyHub
DefaultGroupName=Study Hub
LicenseFile=LICENSE_EULA.txt
OutputDir=installer_output
OutputBaseFilename=StudyHub_Setup
Compression=lzma2/max
SolidCompression=yes
DisableProgramGroupPage=yes
DisableWelcomePage=no

[Tasks]
Name: desktopicon; Description: "Criar atalho na Área de Trabalho"; GroupDescription: "Atalhos adicionais:"
Name: installollama; Description: "Instalar o Ollama (IA Local) - Baixa o instalador oficial e executa em segundo plano (Requer conexao com a internet)"; GroupDescription: "Configuracoes opcionais de IA local (Prós: 100% offline e sem custos. Contras: Alto uso de CPU/RAM e download de ~4.7GB para o modelo)"; Flags: unchecked

[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Study Hub"; Filename: "{app}\StudyHub.vbs"; IconFilename: "{app}\icon.ico"
Name: "{userdesktop}\Study Hub"; Filename: "{app}\StudyHub.vbs"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
; Comando opcional para baixar e instalar o Ollama
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""& {{ [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '$env:TEMP\OllamaSetup.exe'; Start-Process -FilePath '$env:TEMP\OllamaSetup.exe' -ArgumentList '/silent' -Wait }"""; StatusMsg: "Baixando e instalando o Ollama (IA Local) em segundo plano... Por favor, aguarde..."; Flags: runhidden; Tasks: installollama

; Inicia o Study Hub imediatamente após a instalação
Filename: "{app}\StudyHub.vbs"; Description: "Iniciar o Study Hub agora e abrir a Area de Estudos"; Flags: shellexec postinstall nowait
