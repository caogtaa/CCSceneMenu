# Cocos Creator场景编辑器右键菜单插件

<a name="LvBEQ"></a>
### 背景
Cocos Creator的场景编辑器没有自带的右键菜单，也不提供右键菜单的扩展方法（截止目前v2.2.2版）。<br />关卡编辑时，如果将常用功能登记到右键菜单内，可以避免在主菜单、层级视图、资源视图、场景编辑器之间来回切换，提升效率。<br />右键菜单创建节点时，可以直接创建到指定位置，提升效率。

代码：[https://github.com/caogtaa/CCSceneMenu/tree/master](https://github.com/caogtaa/CCSceneMenu/tree/master)<br />演示工程：[https://github.com/caogtaa/CCSceneMenuDemo](https://github.com/caogtaa/CCSceneMenuDemo)

<a name="5LgTA"></a>
### 功能介绍

- 支持通过插件UI编辑场景菜单的内容
- 支持登记prefab uuid到右键菜单，通过菜单创建该prefab的实例。（prefab uuid在资源视图里右击可以查到）
- 支持登记自定义命令到右键菜单（填写自己插件的消息和参数），方便开发者扩展

<a name="Ttx0E"></a>
### 兼容性

- 插件目前只支持2D场景
- 支持Cocos Creator v2.2.2，Windows/Mac。其他版本未测试。

<a name="bJ3D5"></a>
### 效果
场景编辑器<br />![image.png](img/create_node.gif)

菜单管理<br />![image.png](img/new_item.gif)<br />![image.png](img/command.png)

<a name="PCuTN"></a>
### 如何安装
<a name="SGuBV"></a>
#### 方法1，手动安装
将源码解压到项目工程的packages目录下（解压后需要有新目录）

<a name="u5ROG"></a>
#### 方法2，git项目通过submodule安装
```bash
git submodule add git@github.com:caogtaa/CCSceneMenu.git packages/CCSceneMenu
git submodule init
git submodule update
```

