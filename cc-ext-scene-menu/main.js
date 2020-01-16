/*
 * @Author: CGT (caogtaa@gmail.com) 
 * @Date: 2020-01-16 22:09:08 
 * @Last Modified by:   CGT (caogtaa@gmail.com) 
 * @Last Modified time: 2020-01-16 22:09:08 
 */

'use strict';

let _menuTemplateCache = null;
let _paramCache = {};

function createNode(uuid) {
  let param = {uuid: uuid};
  Object.assign(param, _paramCache);
  Editor.Scene.callSceneScript('cc-ext-scene-menu', 'create-node', param, (err) => {
    if (err)
      Editor.log(err);
  });
}

function sendCommand(command, param) {
  let p = {};
  Object.assign(p, _paramCache);
  p.customParam = param;
  Editor.Ipc.sendToMain(command, p, null);
}

function generateMenuTemplate(conf) {
  let result = [];
  for (let c of conf) {
    // https://electronjs.org/docs/api/menu
    let item = {};
    item.label = c.name;
    
    // item.click = createNode.bind(c.uuid);
    // the menu item auto unbound my function, why?
    // so I put uuid in closure
    if (c.type == 0) {
      // prefab
      let uuid = c.uuid;
      item.click = () => {
        createNode(uuid);
      };
    } else if (c.type == 1) {
      // command
      item.click = () => {
        sendCommand(c.command, c.param);
      };
    } else if (c.submenu) {
      item.submenu = generateMenuTemplate(c.submenu);
    } else {
      // unexpected
    }

    result.push(item);
  }

  return result;
}

function loadMenu() {
  const fs = require('fs');
  const configPath = Editor.Project.path + '/scene-menu-config.json';
  fs.readFile(configPath, function(err, data) {
    if (err) {
      // file not exists
      return;
    }

    try {
      // Editor.log(`main.js read data: ${data}`);
      let config = JSON.parse(data);
      _menuTemplateCache = generateMenuTemplate(config);
    } catch (err) {
      // if any error occur, old template cache is not replaced
    } finally {

    }
  });
}

function injectContextMenu(webContents) {
  if (webContents.__gt_injected) {
    // already injected
    return;
  }

  if (webContents != Editor.Window.main.nativeWin.webContents) {
    // not cc main app window
    return;
  }
  webContents.__gt_injected = true;

  let hackCode = `
    (() => {
      function appendListener(node, eventType, fn = null) {
        node.addEventListener(eventType, (e) => {
          if (fn)	fn(e);
        }, true);		
      }
    
      let getLabelRoot = (gridRoot, className) => {
        for (let c of gridRoot.children) {
          if (c.className === className)
            return c;
        }
    
        return null;
      };
    
      let getPixel = (elem) => {
        return parseFloat(elem.style.transform.match(/(-?[0-9\.]+)/g)[0]);
      };
    
      let getWorldPos = (elem) => {
        return parseFloat(elem.innerText.replace(/,/g, ''));
      };
    
      let pixelToWorld = (labelRoot, pixel) => {
        let pmin = getPixel(labelRoot.firstChild);
        let pmax = getPixel(labelRoot.lastChild);
        let wmin = getWorldPos(labelRoot.firstChild);
        let wmax = getWorldPos(labelRoot.lastChild);
        return (pixel - pmin) * (wmax - wmin) / (pmax - pmin) + wmin;
      };
    
      let svgPosToWorld = (x, y) => {
        let gridRoot = document.getElementById('scene').shadowRoot.getElementById('sceneView').shadowRoot.getElementById('grid').shadowRoot;
        let vLabelRoot = getLabelRoot(gridRoot, 'vLabels');
        let hLabelRoot = getLabelRoot(gridRoot, 'hLabels');
        let worldX = pixelToWorld(hLabelRoot, x+4); // horizontal label offset = 4 (move rightward in svg)
        let worldY = pixelToWorld(vLabelRoot, y-15);  // vertical label offset = -15 (move upward in svg)
        return [worldX, worldY];
      };

      let svgNode = null;
      let downX = 0;
      let downY = 0;
      let isDown = false;
      let postContextMenuMsg = () => {
        let rect = svgNode.getBoundingClientRect();
        downX -= rect.left;
        downY -= rect.top;
        let worldX = 0;
        let worldY = 0;
        try {
          let arr = svgPosToWorld(downX, downY);
          worldX = arr[0];
          worldY = arr[1];
        } catch(error) {}

        Editor.Ipc.sendToMain('cc-ext-scene-menu:on-context-menu', 
          {x: downX, y: downY, worldX: worldX, worldY: worldY}, null);
      };
    
      appendListener(document, 'mousedown', (e) => {
        if (e.button != 2)
          return;

        // check if inside svg view
        if (!svgNode)
          svgNode = document.getElementById('scene').shadowRoot.getElementById('sceneView').shadowRoot.getElementById('gizmosView').shadowRoot.getElementById('SvgjsSvg1000');
        
        if (!svgNode) {
          Editor.log('svg view not ready');
          return;
        }
    
        let rect = svgNode.getBoundingClientRect();
        if (e.pageX >= rect.left && e.pageX < rect.right && e.pageY >= rect.top && e.pageY < rect.bottom) {
          downX = e.pageX;
          downY = e.pageY;
          isDown = true;
        }
      });
    
      appendListener(document, 'mouseup', (e) => {
        if (e.button == 2 && isDown && e.pageX == downX && e.pageY == downY) {
          isDown = false;
          postContextMenuMsg();
        }
      });
    })();

    1+2+3
  `;

  webContents.executeJavaScript(hackCode, function(result) {
    // result = 6
  });
}

module.exports = {
  load () {
    loadMenu();
    try {
      if (Editor.Window.main.nativeWin.webContents.__gt_injected) {
        // in case plugin if reloaded
        return;
      }
    } catch(error) {
      // usually happen when creator is just started and main window is not created
      Editor.log(error);
    }

    // todo: 如果插件是中途加载的，判断webContents如果就绪了就注入
    const electron = require('electron');
    let injectFn = injectContextMenu;
    electron.app.on('web-contents-created', (sender, webContents) => {
      webContents.on('dom-ready', (e) => {
        injectFn(e.sender);
      });
    });
  },

  unload () {
    // let webContenst = Editor.Window.main.nativeWin.webContents;
    // if (webContenst.__gt_injected) {
    //     // todo: removeEventListeners
    //     webContenst.__gt_injected = false;
    // }
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    'create-node' () {
      Editor.Scene.callSceneScript('cc-ext-scene-menu', 'create-node', null, function (err) {
        // Editor.log('create-node finish');
      });
    },
    'on-context-menu' (event, param) {
      param = param || {x:0, y:0, worldX: 0, worldY: 0};
      _paramCache = param;
      if (_menuTemplateCache) {
        Editor.Window.main.popupMenu(_menuTemplateCache, param.x, param.y);
      }
    },
    'custom-context-menu' () {
      Editor.Panel.open('cc-ext-scene-menu');
    },
    'update-context-menu' () {
      loadMenu();
    },
    'say-hello' (event, param) {
      Editor.log(`Hello! param: {worldX = ${param.worldX}, worldY = ${param.worldY}}, customParam = ${param.customParam}`);
    }
  },
};