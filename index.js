const path = require('path');
const os = require('os');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const ResizeImg = require('resize-img');

const isMac = process.platform === 'darwin';

let mainWindow;

//create main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        width: 500,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//create about window
function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 600
    });

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

app.whenReady().then(() => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    //remove main window from memory on close
    mainWindow.on('close', () => (mainWindow = null));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

const menu = [
    ...(isMac ? [{ label: app.name, submenu: [{ label: 'About', click: () => createAboutWindow }] }] : []),
    {
        role: 'fileMenu'
    },
    ...(!isMac ? [{ label: 'Help', submenu: [{ label: 'About', click: () => createAboutWindow }] }] : [])
];

ipcMain.on('image:resize', (e, options) => {
    options.dest = path.join(os.homedir(), 'imageresizer');
    resizeImage(options)
});

async function resizeImage({ imgPath, width, height, dest }) {
    try {
        const newPath = await ResizeImg(fs.readFileSync(imgPath), {
            height: +height,
            width: +width
        });

        //create filename
        const fileName = path.basename(imgPath);

        //create dest folder if not exist
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);

        fs.writeFileSync(path.join(dest, fileName), newPath);

        mainWindow.webContents.send('image:done');

        shell.openPath(dest);

    } catch (error) {
        console.log(error)
    }
}

app.on('windown-all-closed', () => { if (!isMac) app.quit() });