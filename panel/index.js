/*
 * @Author: CGT (caogtaa@gmail.com) 
 * @Date: 2020-01-16 22:09:21 
 * @Last Modified by: CGT (caogtaa@gmail.com)
 * @Last Modified time: 2020-01-17 07:32:06
 */

'use strict';

let _config = {};
Editor.Panel.extend({
  // css style for panel

  style: `
    :host { margin: 5px; }
    :host ui-input { width: 100%; }
    h2 { color: #f90; }

    ul {
      list-style-type: none;
      padding-inline-start: 20px;
    }

    ul.root {
      padding-inline-start: 15px;
    }

    ul li {
      padding: 2px 10px 1px 0;
      text-align: -webkit-match-parent;
      color: #ccc;
      border-bottom: 1px solid #454545;
      box-sizing: border-box;
    }

    span.selected {
      background: #555;
    }

    .caret {
      cursor: pointer;
      user-select: none;
      width: 12px;
      display: inline-block;
    }

    .caret-holder {
      width: 12px;
      display: inline-block;
    }
    
    .caret::before {
      content: "\\25B6";
      color: #ccc;
      display: inline-block;
      margin-right: 6px;
    }
    
    .caret-down::before {
      transform: rotate(90deg);  
    }
    
    .nested {
      display: none;
    }

    .collapsed {

    }
    
    .active:not(.collapsed) {
      display: block;
    }
  `,

  // html template for panel
  template: `
    <h2>${Editor.T('cc-ext-scene-menu.PNL_title')}</h2>
    <hr />
    <p>${Editor.T('cc-ext-scene-menu.PNL_hint')}</p>
    <div v-if="d.loaded">
      <ul class="root">
        <li>
          <span class="caret caret-down" v-on:click="toggleCaret"></span>
          <span v-bind:class="{ selected: d.focus_item==null }" v-on:click="d.focus_item=null;" v-on:contextmenu="onContextMenu($event, true, null)">${Editor.T('cc-ext-scene-menu.PNL_root')}</span>
          <ul class="nested active">
            <li v-for="c in d.config">
              <span v-show="c.type == '2'" class="caret" v-on:click="toggleCaret"></span>
              <span v-show="c.type != '2'" class="caret-holder">&nbsp;</span>
              <span v-bind:class="{ selected: d.focus_item==c }" v-on:click="d.focus_item=c;" v-on:contextmenu="onContextMenu($event, false, c)">{{c.name}}</span>
              <ul class="nested" v-bind:class="{ collapsed: c.type!='2' }">
                <li v-for="subc in c.submenu">
                  <span class="caret-holder">&nbsp;</span>
                  <span v-bind:class="{ selected: d.focus_item==subc }" v-on:click="d.focus_item=subc;" v-on:contextmenu="onContextMenu($event, false, subc, c)">{{subc.name}}</span>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>

      <ui-box-container v-if="d.focus_item">
        <ui-prop name="${Editor.T('cc-ext-scene-menu.PNL_name')}">
          <ui-input v-value="d.focus_item.name" placeholder="${Editor.T('cc-ext-scene-menu.PNL_name_ph')}"></ui-input>
        </ui-prop>
        <ui-prop name="${Editor.T('cc-ext-scene-menu.PNL_type')}">
          <ui-select v-value="d.focus_item.type" @change="onTypeChange($event)">
            <option value="0">${Editor.T('cc-ext-scene-menu.PNL_prefab')}</option>
            <option value="1">${Editor.T('cc-ext-scene-menu.PNL_command')}</option>
            <option value="2">${Editor.T('cc-ext-scene-menu.PNL_submenu')}</option>
          </ui-select>
        </ui-prop>
        <ui-prop name="${Editor.T('cc-ext-scene-menu.PNL_prefab_uuid')}" v-if="d.focus_item.type=='0'">
          <ui-input v-value="d.focus_item.uuid" placeholder="prefab uuid"></ui-input>
        </ui-prop>
        <ui-prop name="${Editor.T('cc-ext-scene-menu.PNL_command')}" v-if="d.focus_item.type=='1'">
          <ui-input v-value="d.focus_item.command" placeholder="${Editor.T('cc-ext-scene-menu.PNL_command_ph')}"></ui-input>
        </ui-prop>
        <ui-prop name="${Editor.T('cc-ext-scene-menu.PNL_parameter')}" v-if="d.focus_item.type=='1'">
          <ui-input v-value="d.focus_item.param" placeholder="${Editor.T('cc-ext-scene-menu.PNL_parameter_ph')}"></ui-input>
        </ui-prop>
      </ui-box-container>

      <hr />
      <ui-button id="save" @confirm="onSaveConfirm">${Editor.T('cc-ext-scene-menu.PNL_save')}</ui-button>
    </div>
  `,

  // element and variable binding
  $: {
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    const fs = require('fs');
    let configPath = Editor.Project.path + '/scene-menu-config.json';
    // Editor.log(configPath);
    if (!fs.existsSync(configPath)) {
      // read default config
      configPath = Editor.url('packages://cc-ext-scene-menu/default-config.json');
    }

    let saveConfig = () => {
      let data = JSON.stringify(_config, null, 4);
      fs.writeFile(configPath, data, function(err) {
        if (err) {
          Editor.log(err);
          return;
        }

        Editor.Ipc.sendToMain('cc-ext-scene-menu:update-context-menu');
      });
    };

    let initWindow = (config) => {
      _config = config;
      new window.Vue({
        el: this.shadowRoot,
        data: {
          d: {
            config: _config,
            focus_item: null,
            loaded: true,
            command: '',
            param: ''
          }
        },
        methods: {
          onSaveConfirm (e) {
            e.stopPropagation();
            saveConfig();
          },
          toggleCaret (e) {
            e.target.classList.toggle('caret-down');
            e.target.parentElement.querySelector(".nested").classList.toggle("active");
          },
          onContextMenu (e, isRoot, obj = null, parent = null) {
            this.d.focus_item = obj;
            let d = this.d;
            let electron = require("electron");
            let menuTemplate = [];
            let currentTarget = e.currentTarget;
            if (!parent) {
              // max depth is 2
              menuTemplate.push({
                label: Editor.T('cc-ext-scene-menu.PNL_add_child'),
                click () {
                  let newItem = {
                    type: "0",
                    name: "New Item",
                    uuid: "",
                    submenu: [],
                    command: "",
                    param: ""
                  };

                  if (isRoot) {
                    d.config.push(newItem);
                  } else {
                    if (!obj.submenu) {
                      obj.submenu = [];
                    }

                    obj.type = 2;
                    obj.submenu.push(newItem);
                    currentTarget.parentElement.querySelector(".nested").classList.add("active");
                    currentTarget.parentElement.querySelector(".nested").classList.remove("collapsed");
                    currentTarget.parentElement.querySelector(".caret").classList.add("caret-down");
                  }
                }
              });
            }

            if (!isRoot) {
              let d = this.d;
              menuTemplate.push({
                label: Editor.T('cc-ext-scene-menu.PNL_delete'),
                click () {
                  if (obj && parent) {
                    // deep level item
                    const index = parent.submenu.indexOf(obj);
                    if (index > -1) {
                      if (d.focus_item == obj) {
                        d.focus_item = null;
                      }
                      parent.submenu.splice(index, 1);
                    }
                  } else if (obj) {
                    // 1st level item
                    const index = config.indexOf(obj);
                    if (index > -1) {
                      if (d.focus_item == obj) {
                        d.focus_item = null;
                      }
                      config.splice(index, 1);
                    }
                  }
                }
              });
            }

            let menu = electron.remote.Menu.buildFromTemplate(menuTemplate);
            menu.popup();
            e.preventDefault();
          },
          onTypeChange(e) {
          }
        }
      });
    };

    fs.readFile(configPath, function(err, data) {
      if (err) {
        // file not exists
        initWindow([]);
        return;
      }

      let config = [];
      try {
        config = JSON.parse(data);
        // Editor.log(`index.js read data: ${data}`);
      } catch (err) {

      } finally {
        initWindow(config);
      }
    });
  },

  // register your ipc messages here
  messages: {
    'cc-ext-scene-menu:demo' (event) {
      Editor.log('this is Demo');
    }
  }
});
