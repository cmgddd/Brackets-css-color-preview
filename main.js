/*
 * Copyright (c) 2014 Neil.M.Chen. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/* jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/* global define, $, brackets, window */

/* Extension to allow a user to preview colors within a css file */

define(function (require, exports, module) {
    "use strict";

    // Brackets modules.
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        _ = brackets.getModule("thirdparty/lodash"),
        CommandManager = brackets.getModule("command/CommandManager"),
        EditorManager   = brackets.getModule('editor/EditorManager'),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        ColorUtils   = brackets.getModule('utils/ColorUtils'),
        Menus = brackets.getModule("command/Menus"),
        AppInit = brackets.getModule("utils/AppInit"),

        // Extension variables.
        COMMAND_NAME = 'cssColorPreview.enable', // package-style naming to avoid collisions
        COLOR_REGEX = ColorUtils.COLOR_REGEX,    // used to match color
        _prefs = PreferencesManager.getExtensionPrefs("brackets-css-color-preview"),
        gutterName = "CodeMirror-colorGutter",
        _enabled = true;

    ExtensionUtils.loadStyleSheet(module, "main.css");

    var CssColorPreview = {

        // Toggle the extension, set the _document and register the listener.
        toggleEnable: function () {
            _enabled = !_enabled;

            // Set the new state for the menu item, update the _prefs also.
            _prefs.set("enabled", _enabled);
            _prefs.save();
            CommandManager.get(COMMAND_NAME).setChecked(_enabled);
            if(_enabled){
                CssColorPreview.showColorMarks();
                CssColorPreview.regisiterHandlers();
            } else {
                var editor = CssColorPreview.getEditor();
                if(editor) {
                    var cm = editor._codeMirror;
                    cm.clearGutter(gutterName); // clear color markers
                }
                CssColorPreview.removeHandlers();
            }
        },

        // Get editor
        getEditor: function() {
            return EditorManager.getActiveEditor();
        },
        // show color preview
        showColorMarks: function() {
            // TODO ********
            // For now, direct access to the underlying CodeMirror object is still possible via _codeMirror
            // -- but this is considered deprecated and may go away.
            // *********
            var editor = CssColorPreview.getEditor();
            if(editor) {
                var cm = editor._codeMirror;
                var nLen = cm.lineCount();
                var aColors = [];

                // match colors and push into an array
                for(var i = 0; i < nLen; i++) {
                    var lineText = cm.getLine(i);

                    if( (lineText.indexOf('/*')!=-1) || (lineText.indexOf('*/')!=-1) ){
                        continue;
                    } else {
                        var regx = /:.*?;/g;
                        lineText = lineText.match(regx);
                        if(lineText){
                            var tempItem = lineText[0].match(COLOR_REGEX);
                            // todo current support one color to show only
                            if(tempItem){
                                var tempColor = tempItem[0];
                                aColors.push({
                                   line_number : i,
                                   color_value : tempColor
                                });
                            }
                        }
                    }

                }
                CssColorPreview.showGutters(editor, aColors);
            }
        },

        onChanged : function () {
            CssColorPreview.showColorMarks();
        },

        init: function() {
            if (_prefs.get("enabled")==="undefined") {
                _prefs.definePreference("enabled", "boolean", _enabled);
            } else {
                _enabled = _prefs.get("enabled");
            }
            CommandManager.register("Enable Css Color Preview", COMMAND_NAME, CssColorPreview.toggleEnable);
            // Then create a menu item bound to the command
            Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(COMMAND_NAME);

            // Set the starting state for the menu item.
            CommandManager.get(COMMAND_NAME).setChecked(_enabled);

            if(!_enabled){return;}
            CssColorPreview.showColorMarks();
            CssColorPreview.regisiterHandlers();
        },
        regisiterHandlers: function () {
            var editor = CssColorPreview.getEditor();
            // when activeEditorChange
            $(EditorManager).on("activeEditorChange", CssColorPreview.onChanged);
            if(editor){
                var cm = editor._codeMirror;
                cm.on("change", CssColorPreview.onChanged);
            }
        },
        removeHandlers: function () {
            var editor = CssColorPreview.getEditor();
            if(editor){
                var cm = editor._codeMirror;
                cm.off("change", CssColorPreview.onChanged);
            }
            // when activeEditorChange
            $(EditorManager).off("activeEditorChange", CssColorPreview.onChanged);
        },

        initGutter: function(editor) {

            var cm = editor._codeMirror;
            var gutters = cm.getOption("gutters").slice(0);
            var str = gutters.join('');
            if (str.indexOf(gutterName) === -1) {
                gutters.unshift(gutterName);
                cm.setOption("gutters", gutters);
            }
        },

        showGutters: function(editor, _results) {
            if(editor){
                CssColorPreview.initGutter(editor);
                var cm = editor._codeMirror;
                cm.clearGutter(gutterName); // clear color markers
                cm.colorGutters = _.sortBy(_results, "line_number");
                cm.colorGutters.forEach(function (obj) {
                    var $marker = $("<i>")
                                    .addClass("ico-cssColorPreview")
                                    .html("&nbsp;").css('background-color',obj.color_value);
                    cm.setGutterMarker(obj.line_number, gutterName, $marker[0]);
                });
            }
        }
    }

    // init after appReady
    AppInit.appReady(function() {
        setTimeout(CssColorPreview.init,1000);
    });

});
