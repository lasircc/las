(function($) {
    var lasform = {util:{}};

    var reArray = /\[([0-9]*)\](?=\[|\.|$)/g;

    /**
     * Escapes selector name for use with jQuery
     *
     * All meta-characters listed in jQuery doc are escaped:
     * http://api.jquery.com/category/selectors/
     *
     * @function
     * @param {String} selector The jQuery selector to escape
     * @return {String} The escaped selector.
    */
    var escapeSelector = function (selector) {
        return selector.replace(/([ \!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;<\=\>\?\@\[\\\]\^\`\{\|\}\~])/g, '\\$1');
    };

    /**
     * Template settings for form views
     */
    var fieldTemplateSettings = {
        evaluate    : /<%([\s\S]+?)%>/g,
        interpolate : /<%=([\s\S]+?)%>/g
    };

    /**
     *
     * Slugifies a string by replacing spaces with _. Used to create
     * valid classnames and ids for the form.
     *
     * @function
     * @param {String} str The string to slugify
     * @return {String} The slugified string.
     */
    var slugify = function(str) {
        return str.replace(/\ /g, '_');
    }

    /**
     * Retrieves the key definition from the given schema.
     *
     * The key is identified by the path that leads to the key in the
     * structured object that the schema would generate. Each level is
     * separated by a '.'. Array levels are marked with []. For instance:
     *  foo.bar[].baz
     * ... to retrieve the definition of the key at the following location
     * in the JSON schema (using a dotted path notation):
     *  foo.properties.bar.items.properties.baz
     *
     * @function
     * @param {Object} schema The JSON schema to retrieve the key from
     * @param {String} key The path to the key, each level being separated
     *  by a dot and array items being flagged with [].
     * @return {Object} The key definition in the schema, null if not found.
     */
    var getSchemaKey = function(schema,key) {
        var schemaKey = key
        .replace(/\./g, '.properties.')
        .replace(/\[[0-9]*\]/g, '.items');
        var schemaDef = lasform.util.getObjKey(schema, schemaKey, true);
        if (schemaDef && schemaDef.$ref) {
        throw new Error('lasform does not yet support schemas that use the ' +
            '$ref keyword.');
        }
        return schemaDef;
    };


    /**
     * Applies the array path to the key path.
     *
     * For instance, if the key path is:
     *  foo.bar[].baz.toto[].truc[].bidule
     * and the arrayPath [4, 2], the returned key will be:
     *  foo.bar[4].baz.toto[2].truc[].bidule
     *
     * @function
     * @param {String} key The path to the key in the schema, each level being
     *  separated by a dot and array items being flagged with [].
     * @param {Array(Number)} arrayPath The array path to apply, e.g. [4, 2]
     * @return {String} The path to the key that matches the array path.
     */
    var applyArrayPath = function (key, arrayPath) {
        var depth = 0;
        if (!key) return null;
        if (!arrayPath || (arrayPath.length === 0)) return key;
        var newKey = key.replace(reArray, function (str, p1) {
        // Note this function gets called as many times as there are [x] in the ID,
        // from left to right in the string. The goal is to replace the [x] with
        // the appropriate index in the new array path, if defined.
        var newIndex = str;
        if (isSet(arrayPath[depth])) {
            newIndex = '[' + arrayPath[depth] + ']';
        }
        depth += 1;
        return newIndex;
        });
        return newKey;
    };

    // From backbonejs
    var escapeHTML = function (string) {
        if (!isSet(string)) {
        return '';
        }
        string = '' + string;
        if (!string) {
        return '';
        }
        return string
        .replace(/&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };


    /**
     * Template settings for value replacement
     */
    var valueTemplateSettings = {
        evaluate    : /\{\[([\s\S]+?)\]\}/g,
        interpolate : /\{\{([\s\S]+?)\}\}/g
    };

    /**
     * Returns true if given value is neither "undefined" nor null
     */
    var isSet = function (value) {
        return !(_.isUndefined(value) || _.isNull(value));
    };

    /**
     * Returns true if given property is directly property of an object
     */
    var hasOwnProperty = function (obj, prop) {
        return typeof obj === 'object' && obj.hasOwnProperty(prop);
    }

    //Allow to access subproperties by splitting "."
    /**
     * Retrieves the key identified by a path selector in the structured object.
     *
     * Levels in the path are separated by a dot. Array items are marked
     * with [x]. For instance:
     *  foo.bar[3].baz
     *
     * @function
     * @param {Object} obj Structured object to parse
     * @param {String} key Path to the key to retrieve
     * @param {boolean} ignoreArrays True to use first element in an array when
     *   stucked on a property. This parameter is basically only useful when
     *   parsing a JSON schema for which the "items" property may either be an
     *   object or an array with one object (only one because JSON form does not
     *   support mix of items for arrays).
     * @return {Object} The key's value.
     */
    lasform.util.getObjKey = function (obj, key, ignoreArrays) {
        var innerobj = obj;
        var keyparts = key.split(".");
        var subkey = null;
        var arrayMatch = null;
        var prop = null;
    
        for (var i = 0; i < keyparts.length; i++) {
        if ((innerobj === null) || (typeof innerobj !== "object")) return null;
        subkey = keyparts[i];
        prop = subkey.replace(reArray, '');
        reArray.lastIndex = 0;
        arrayMatch = reArray.exec(subkey);
        if (arrayMatch) {
            while (true) {
            if (prop && !_.isArray(innerobj[prop])) return null;
            innerobj = prop ? innerobj[prop][parseInt(arrayMatch[1])] : innerobj[parseInt(arrayMatch[1])];
            arrayMatch = reArray.exec(subkey);
            if (!arrayMatch) break;
            // In the case of multidimensional arrays,
            // we should not take innerobj[prop][0] anymore,
            // but innerobj[0] directly
            prop = null;
            }
        } else if (ignoreArrays &&
            !innerobj[prop] &&
            _.isArray(innerobj) &&
            innerobj[0]) {
            innerobj = innerobj[0][prop];
        } else {
            innerobj = innerobj[prop];
        }
        }
    
        if (ignoreArrays && _.isArray(innerobj) && innerobj[0]) {
        return innerobj[0];
        } else {
        return innerobj;
        }
    };

    lasform.fieldTemplate = function(inner) {
        return '<div ' +
          '<% for(var key in elt.htmlMetaData) {%>' +
            '<%= key %>="<%= elt.htmlMetaData[key] %>" ' +
          '<% }%>' +
          'class="form-group lasform-error-<%= keydash %>' +
          '<%= elt.htmlClass ? " " + elt.htmlClass : "" %>' +
          '<%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " lasform-required" : "") %>' +
          '<%= (node.readOnly ? " lasform-readonly" : "") %>' +
          '<%= (node.disabled ? " lasform-disabled" : "") %>' +
          '">' +
          '<% if (!elt.notitle) { %>' +
            '<label for="<%= node.id %>"><%= node.title ? node.title : node.name %></label>' +
          '<% } %>' +
          '<div class="controls">' +
            '<% if (node.prepend || node.append) { %>' +
            '<div class="<% if (node.prepend) { %>input-group<% } %>' +
              '<% if (node.append) { %> input-group<% } %>">' +
              '<% if (node.prepend) { %>' +
                '<span class="input-group-addon"><%= node.prepend %></span>' +
              '<% } %>' +
            '<% } %>' +
            inner +
            '<% if (node.append) { %>' +
              '<span class="input-group-addon"><%= node.append %></span>' +
            '<% } %>' +
            '<% if (node.prepend || node.append) { %>' +
              '</div>' +
            '<% } %>' +
            '<% if (node.description) { %>' +
              '<span class="help-block"><%= node.description %></span>' +
            '<% } %>' +
            '<span class="help-block lasform-errortext" style="display:none;"></span>' +
          '</div></div>';
    };

    /**
     * Returns the structured object that corresponds to the form values entered
     * by the use for the given form.
     *
     * The form must have been previously rendered through a call to lasform.
     *
     * @function
     * @param {Node} The <form> tag in the DOM
     * @return {Object} The object that follows the data schema and matches the
     *  values entered by the user.
     */
    lasform.getFormValue = function (formelt) {
        var form = $(formelt).data('lasform-tree');
        if (!form) return null;
        return form.root.getFormValues();
    };

    /**
     * Sets the key identified by a path selector to the given value.
     *
     * Levels in the path are separated by a dot. Array items are marked
     * with [x]. For instance:
     *  foo.bar[3].baz
     *
     * The hierarchy is automatically created if it does not exist yet.
     *
     * @function
     * @param {Object} obj The object to build
     * @param {String} key The path to the key to set where each level
     *  is separated by a dot, and array items are flagged with [x].
     * @param {Object} value The value to set, may be of any type.
     */
    lasform.util.setObjKey = function(obj,key,value) {
        var innerobj = obj;
        var keyparts = key.split(".");
        var subkey = null;
        var arrayMatch = null;
        var prop = null;
    
        for (var i = 0; i < keyparts.length-1; i++) {
        subkey = keyparts[i];
        prop = subkey.replace(reArray, '');
        reArray.lastIndex = 0;
        arrayMatch = reArray.exec(subkey);
        if (arrayMatch) {
            // Subkey is part of an array
            while (true) {
            if (!_.isArray(innerobj[prop])) {
                innerobj[prop] = [];
            }
            innerobj = innerobj[prop];
            prop = parseInt(arrayMatch[1], 10);
            arrayMatch = reArray.exec(subkey);
            if (!arrayMatch) break;
            }
            if ((typeof innerobj[prop] !== 'object') ||
            (innerobj[prop] === null)) {
            innerobj[prop] = {};
            }
            innerobj = innerobj[prop];
        }
        else {
            // "Normal" subkey
            if ((typeof innerobj[prop] !== 'object') ||
            (innerobj[prop] === null)) {
            innerobj[prop] = {};
            }
            innerobj = innerobj[prop];
        }
        }
    
        // Set the final value
        subkey = keyparts[keyparts.length - 1];
        prop = subkey.replace(reArray, '');
        reArray.lastIndex = 0;
        arrayMatch = reArray.exec(subkey);
        if (arrayMatch) {
        while (true) {
            if (!_.isArray(innerobj[prop])) {
            innerobj[prop] = [];
            }
            innerobj = innerobj[prop];
            prop = parseInt(arrayMatch[1], 10);
            arrayMatch = reArray.exec(subkey);
            if (!arrayMatch) break;
        }
        innerobj[prop] = value;
        }
        else {
        innerobj[prop] = value;
        }
    };

    var inputFieldTemplate = function (type) {
        return {
            'template': '<input type="' + type + '" ' +
            'class=\'form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>\'' +
            'name="<%= node.name %>" value="<%= escape(value) %>" id="<%= id %>"' +
            '<%= (node.disabled? " disabled" : "")%>' +
            '<%= (node.readOnly ? " readonly=\'readonly\'" : "") %>' +
            '<%= (node.schemaElement && (node.schemaElement.step > 0 || node.schemaElement.step == "any") ? " step=\'" + node.schemaElement.step + "\'" : "") %>' +
            '<%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength=\'" + node.schemaElement.maxLength + "\'" : "") %>' +
            '<%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required=\'required\'" : "") %>' +
            '<%= (node.placeholder? " placeholder=" + \'"\' + escape(node.placeholder) + \'"\' : "")%>' +
            ' />',
            'fieldtemplate': true,
            'inputfield': true
        }
    };

    lasform.elementTypes = {
        'none': {
          'template': ''
        },
        'root': {
          'template': '<div><%= children %></div>'
        },
        'text': inputFieldTemplate('text'),
        'password': inputFieldTemplate('password'),
        'date': inputFieldTemplate('date'),
        'datetime': inputFieldTemplate('datetime'),
        'datetime-local': inputFieldTemplate('datetime-local'),
        'email': inputFieldTemplate('email'),
        'month': inputFieldTemplate('month'),
        'number': inputFieldTemplate('number'),
        'search': inputFieldTemplate('search'),
        'tel': inputFieldTemplate('tel'),
        'time': inputFieldTemplate('time'),
        'url': inputFieldTemplate('url'),
        'week': inputFieldTemplate('week'),
        'color':{
          'template':'<div id="<%= id %>" class="input-group"><input type="text" ' +
            'class=\'form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>\'' +
            'name="<%= node.name %>" value="<%= escape(value) %>"' +
            '<%= (node.disabled? " disabled" : "")%>' +
            '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
            ' /><span class="input-group-append"> <span class="input-group-text colorpicker-input-addon"><i></i></span> </span></div>',
          'fieldtemplate': true,
          'inputfield': true,
          'onInsert': function(evt, node) {
            $(node.el).find('#' + escapeSelector(node.id)).colorpicker();
          }
        },
        'textarea':{
          'template':'<textarea id="<%= id %>" name="<%= node.name %>" ' +
            'class=\'form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>\'' +
            'style="height:<%= elt.height || "150px" %>;width:<%= elt.width || "100%" %>;"' +
            '<%= (node.disabled? " disabled" : "")%>' +
            '<%= (node.readOnly ? " readonly=\'readonly\'" : "") %>' +
            '<%= (node.schemaElement && node.schemaElement.maxLength ? " maxlength=\'" + node.schemaElement.maxLength + "\'" : "") %>' +
            '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
            '<%= (node.placeholder? " placeholder=" + \'"\' + escape(node.placeholder) + \'"\' : "")%>' +
            '><%= value %></textarea>',
          'fieldtemplate': true,
          'inputfield': true
        },
        'checkbox':{
          'template': '<div class="checkbox"><label><input type="checkbox" id="<%= id %>" ' +
            '<%= (fieldHtmlClass ? " class=\'" + fieldHtmlClass + "\'": "") %>' +
            'name="<%= node.name %>" value="1" <% if (value) {%>checked<% } %>' +
            '<%= (node.disabled? " disabled" : "")%>' +
            '<%= (node.schemaElement && node.schemaElement.required && (node.schemaElement.type !== "boolean") ? " required=\'required\'" : "") %>' +
            ' /><%= node.inlinetitle || "" %>' +
            '</label></div>',
          'fieldtemplate': true,
          'inputfield': true,
          'getElement': function (el) {
            return $(el).parent().get(0);
          }
        },
        'file':{
          'template':'<input class="input-file" id="<%= id %>" name="<%= node.name %>" type="file" ' +
            '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
            '/>',
          'fieldtemplate': true,
          'inputfield': true
        },
        'select':{
          'template':'<select name="<%= node.name %>" id="<%= id %>"' +
            'class=\'form-control<%= (fieldHtmlClass ? " " + fieldHtmlClass : "") %>\'' +
            '<%= (node.schemaElement && node.schemaElement.disabled? " disabled" : "")%>' +
            '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
            '> ' +
            '<% _.each(node.options, function(key, val) { if(key instanceof Object) { if (value === key.value) { %> <option selected value="<%= key.value %>"><%= key.title %></option> <% } else { %> <option value="<%= key.value %>"><%= key.title %></option> <% }} else { if (value === key) { %> <option selected value="<%= key %>"><%= key %></option> <% } else { %><option value="<%= key %>"><%= key %></option> <% }}}); %> ' +
            '</select>',
          'fieldtemplate': true,
          'inputfield': true
        },
        'imageselect': {
          'template': '<div>' +
            '<input type="hidden" name="<%= node.name %>" id="<%= node.id %>" value="<%= value %>" />' +
            '<div class="dropdown">' +
            '<a class="btn<% if (buttonClass && node.value) { %> <%= buttonClass %><% } else { %> btn-default<% } %>" data-toggle="dropdown" href="#"<% if (node.value) { %> style="max-width:<%= width %>px;max-height:<%= height %>px"<% } %>>' +
              '<% if (node.value) { %><img src="<% if (!node.value.match(/^https?:/)) { %><%= prefix %><% } %><%= node.value %><%= suffix %>" alt="" /><% } else { %><%= buttonTitle %><% } %>' +
            '</a>' +
            '<div class="dropdown-menu navbar" id="<%= node.id %>_dropdown">' +
              '<div>' +
              '<% _.each(node.options, function(key, idx) { if ((idx > 0) && ((idx % columns) === 0)) { %></div><div><% } %><a class="btn<% if (buttonClass) { %> <%= buttonClass %><% } else { %> btn-default<% } %>" style="max-width:<%= width %>px;max-height:<%= height %>px"><% if (key instanceof Object) { %><img src="<% if (!key.value.match(/^https?:/)) { %><%= prefix %><% } %><%= key.value %><%= suffix %>" alt="<%= key.title %>" /></a><% } else { %><img src="<% if (!key.match(/^https?:/)) { %><%= prefix %><% } %><%= key %><%= suffix %>" alt="" /><% } %></a> <% }); %>' +
              '</div>' +
              '<div class="pagination-right"><a class="btn btn-default">Reset</a></div>' +
            '</div>' +
            '</div>' +
            '</div>',
          'fieldtemplate': true,
          'inputfield': true,
          'onBeforeRender': function (data, node) {
            var elt = node.formElement || {};
            var nbRows = null;
            var maxColumns = elt.imageSelectorColumns || 5;
            data.buttonTitle = elt.imageSelectorTitle || 'Select...';
            data.prefix = elt.imagePrefix || '';
            data.suffix = elt.imageSuffix || '';
            data.width = elt.imageWidth || 32;
            data.height = elt.imageHeight || 32;
            data.buttonClass = elt.imageButtonClass || false;
            if (node.options.length > maxColumns) {
              nbRows = Math.ceil(node.options.length / maxColumns);
              data.columns = Math.ceil(node.options.length / nbRows);
            }
            else {
              data.columns = maxColumns;
            }
          },
          'getElement': function (el) {
            return $(el).parent().get(0);
          },
          'onInsert': function (evt, node) {
            $(node.el).on('click', '.dropdown-menu a', function (evt) {
              evt.preventDefault();
              evt.stopPropagation();
              var img = (evt.target.nodeName.toLowerCase() === 'img') ?
                $(evt.target) :
                $(evt.target).find('img');
              var value = img.attr('src');
              var elt = node.formElement || {};
              var prefix = elt.imagePrefix || '';
              var suffix = elt.imageSuffix || '';
              var width = elt.imageWidth || 32;
              var height = elt.imageHeight || 32;
              if (value) {
                if (value.indexOf(prefix) === 0) {
                  value = value.substring(prefix.length);
                }
                value = value.substring(0, value.length - suffix.length);
                $(node.el).find('input').attr('value', value);
                $(node.el).find('a[data-toggle="dropdown"]')
                  .addClass(elt.imageButtonClass)
                  .attr('style', 'max-width:' + width + 'px;max-height:' + height + 'px')
                  .html('<img src="' + (!value.match(/^https?:/) ? prefix : '') + value + suffix + '" alt="" />');
              }
              else {
                $(node.el).find('input').attr('value', '');
                $(node.el).find('a[data-toggle="dropdown"]')
                  .removeClass(elt.imageButtonClass)
                  .removeAttr('style')
                  .html(elt.imageSelectorTitle || 'Select...');
              }
            });
          }
        },
        'iconselect': {
          'template': '<div>' +
            '<input type="hidden" name="<%= node.name %>" id="<%= node.id %>" value="<%= value %>" />' +
            '<div class="dropdown">' +
            '<a class="btn<% if (buttonClass && node.value) { %> <%= buttonClass %><% } %>" data-toggle="dropdown" href="#"<% if (node.value) { %> style="max-width:<%= width %>px;max-height:<%= height %>px"<% } %>>' +
              '<% if (node.value) { %><i class="icon-<%= node.value %>" /><% } else { %><%= buttonTitle %><% } %>' +
            '</a>' +
            '<div class="dropdown-menu navbar" id="<%= node.id %>_dropdown">' +
              '<div>' +
              '<% _.each(node.options, function(key, idx) { if ((idx > 0) && ((idx % columns) === 0)) { %></div><div><% } %><a class="btn<% if (buttonClass) { %> <%= buttonClass %><% } %>" ><% if (key instanceof Object) { %><i class="icon-<%= key.value %>" alt="<%= key.title %>" /></a><% } else { %><i class="icon-<%= key %>" alt="" /><% } %></a> <% }); %>' +
              '</div>' +
              '<div class="pagination-right"><a class="btn">Reset</a></div>' +
            '</div>' +
            '</div>' +
            '</div>',
          'fieldtemplate': true,
          'inputfield': true,
          'onBeforeRender': function (data, node) {
            var elt = node.formElement || {};
            var nbRows = null;
            var maxColumns = elt.imageSelectorColumns || 5;
            data.buttonTitle = elt.imageSelectorTitle || 'Select...';
            data.buttonClass = elt.imageButtonClass || false;
            if (node.options.length > maxColumns) {
              nbRows = Math.ceil(node.options.length / maxColumns);
              data.columns = Math.ceil(node.options.length / nbRows);
            }
            else {
              data.columns = maxColumns;
            }
          },
          'getElement': function (el) {
            return $(el).parent().get(0);
          },
          'onInsert': function (evt, node) {
            $(node.el).on('click', '.dropdown-menu a', function (evt) {
              evt.preventDefault();
              evt.stopPropagation();
              var i = (evt.target.nodeName.toLowerCase() === 'i') ?
                $(evt.target) :
                $(evt.target).find('i');
              var value = i.attr('class');
              var elt = node.formElement || {};
              if (value) {
                value = value;
                $(node.el).find('input').attr('value', value);
                $(node.el).find('a[data-toggle="dropdown"]')
                  .addClass(elt.imageButtonClass)
                  .html('<i class="'+ value +'" alt="" />');
              }
              else {
                $(node.el).find('input').attr('value', '');
                $(node.el).find('a[data-toggle="dropdown"]')
                  .removeClass(elt.imageButtonClass)
                  .html(elt.imageSelectorTitle || 'Select...');
              }
            });
          }
        },
        'radios':{
          'template': '<div id="<%= node.id %>"><% _.each(node.options, function(key, val) { %><div class="radio"><label><input<%= (fieldHtmlClass ? " class=\'" + fieldHtmlClass + "\'": "") %> type="radio" <% if (((key instanceof Object) && (value === key.value)) || (value === key)) { %> checked="checked" <% } %> name="<%= node.name %>" value="<%= (key instanceof Object ? key.value : key) %>"' +
            '<%= (node.disabled? " disabled" : "")%>' +
            '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
            '/><%= (key instanceof Object ? key.title : key) %></label></div> <% }); %></div>',
          'fieldtemplate': true,
          'inputfield': true
        },
        'radiobuttons': {
          'template': '<div id="<%= node.id %>">' +
            '<% _.each(node.options, function(key, val) { %>' +
              '<label class="btn btn-default">' +
              '<input<%= (fieldHtmlClass ? " class=\'" + fieldHtmlClass + "\'": "") %> type="radio" style="position:absolute;left:-9999px;" ' +
              '<% if (((key instanceof Object) && (value === key.value)) || (value === key)) { %> checked="checked" <% } %> name="<%= node.name %>" value="<%= (key instanceof Object ? key.value : key) %>" />' +
              '<span><%= (key instanceof Object ? key.title : key) %></span></label> ' +
              '<% }); %>' +
            '</div>',
          'fieldtemplate': true,
          'inputfield': true,
          'onInsert': function (evt, node) {
            var activeClass = 'active';
            var elt = node.formElement || {};
            if (elt.activeClass) {
              activeClass += ' ' + elt.activeClass;
            }
            $(node.el).find('label').on('click', function () {
              $(this).parent().find('label').removeClass(activeClass);
              $(this).addClass(activeClass);
            });
          }
        },
        'checkboxes':{
          'template': '<div><%= choiceshtml %></div>',
          'fieldtemplate': true,
          'inputfield': true,
          'onBeforeRender': function (data, node) {
            // Build up choices from the enumeration list
            var choices = null;
            var choiceshtml = null;
            var template = '<div class="checkbox"><label>' +
              '<input type="checkbox" <% if (value) { %> checked="checked" <% } %> name="<%= name %>" value="1"' +
              '<%= (node.disabled? " disabled" : "")%>' +
              '/><%= title %></label></div>';
            if (!node || !node.schemaElement) return;
      
            if (node.schemaElement.items) {
              choices =
                node.schemaElement.items["enum"] ||
                node.schemaElement.items[0]["enum"];
            } else {
              choices = node.schemaElement["enum"];
            }
            if (!choices) return;
      
            choiceshtml = '';
            _.each(choices, function (choice, idx) {
              choiceshtml += _.template(template, fieldTemplateSettings)({
                name: node.key + '[' + idx + ']',
                value: _.include(node.value, choice),
                title: hasOwnProperty(node.formElement.titleMap, choice) ? node.formElement.titleMap[choice] : choice,
                node: node
              });
            });
      
            data.choiceshtml = choiceshtml;
          }
        },
        'array': {
          'template': '<div id="<%= id %>"><ul class="_lasform-array-ul" style="list-style-type:none;"><%= children %></ul>' +
            '<span class="_lasform-array-buttons">' +
              '<a href="#" class="btn btn-default _lasform-array-addmore"><i class="fa fa-plus" title="Add new"></i></a> ' +
              '<a href="#" class="btn btn-default _lasform-array-deletelast"><i class="fa fa-minus" title="Delete last"></i></a>' +
            '</span>' +
            '</div>',
          'fieldtemplate': true,
          'array': true,
          'childTemplate': function (inner) {
            if ($('').sortable) {
              // Insert a "draggable" icon
              // floating to the left of the main element
              return '<li data-idx="<%= node.childPos %>">' +
                '<span class="draggable line"><i class="glyphicon glyphicon-list" title="Move item"></i></span>' +
                inner +
                '</li>';
            }
            else {
              return '<li data-idx="<%= node.childPos %>">' +
                inner +
                '</li>';
            }
          },
          'onInsert': function (evt, node) {
            var $nodeid = $(node.el).find('#' + escapeSelector(node.id));
            var boundaries = node.getArrayBoundaries();
      
            // Switch two nodes in an array
            var moveNodeTo = function (fromIdx, toIdx) {
              // Note "switchValuesWith" extracts values from the DOM since field
              // values are not synchronized with the tree data structure, so calls
              // to render are needed at each step to force values down to the DOM
              // before next move.
              // TODO: synchronize field values and data structure completely and
              // call render only once to improve efficiency.
              if (fromIdx === toIdx) return;
              var incr = (fromIdx < toIdx) ? 1: -1;
              var i = 0;
              var parentEl = $('> ul', $nodeid);
              for (i = fromIdx; i !== toIdx; i += incr) {
                node.children[i].switchValuesWith(node.children[i + incr]);
                node.children[i].render(parentEl.get(0));
                node.children[i + incr].render(parentEl.get(0));
              }
      
              // No simple way to prevent DOM reordering with jQuery UI Sortable,
              // so we're going to need to move sorted DOM elements back to their
              // origin position in the DOM ourselves (we switched values but not
              // DOM elements)
              var fromEl = $(node.children[fromIdx].el);
              var toEl = $(node.children[toIdx].el);
              fromEl.detach();
              toEl.detach();
              if (fromIdx < toIdx) {
                if (fromIdx === 0) parentEl.prepend(fromEl);
                else $(node.children[fromIdx-1].el).after(fromEl);
                $(node.children[toIdx-1].el).after(toEl);
              }
              else {
                if (toIdx === 0) parentEl.prepend(toEl);
                else $(node.children[toIdx-1].el).after(toEl);
                $(node.children[fromIdx-1].el).after(fromEl);
              }
            };
      
            $('> span > a._lasform-array-addmore', $nodeid).click(function (evt) {
              evt.preventDefault();
              evt.stopPropagation();
              var idx = node.children.length;
              if (boundaries.maxItems >= 0) {
                if (node.children.length > boundaries.maxItems - 2) {
                  $nodeid.find('> span > a._lasform-array-addmore')
                    .addClass('disabled');
                }
                if (node.children.length > boundaries.maxItems - 1) {
                  return false;
                }
              }
              node.insertArrayItem(idx, $('> ul', $nodeid).get(0));
              if ((boundaries.minItems <= 0) ||
                  ((boundaries.minItems > 0) &&
                    (node.children.length > boundaries.minItems - 1))) {
                $nodeid.find('> span > a._lasform-array-deletelast')
                  .removeClass('disabled');
              }
            });
      
            //Simulate Users click to setup the form with its minItems
            var curItems = $('> ul > li', $nodeid).length;
            if ((boundaries.minItems > 0) &&
                (curItems < boundaries.minItems)) {
              for (var i = 0; i < (boundaries.minItems - 1) && ($nodeid.find('> ul > li').length < boundaries.minItems); i++) {
                //console.log('Calling click: ',$nodeid);
                //$('> span > a._lasform-array-addmore', $nodeid).click();
                node.insertArrayItem(curItems, $nodeid.find('> ul').get(0));
              }
            }
            if ((boundaries.minItems > 0) &&
                (node.children.length <= boundaries.minItems)) {
              $nodeid.find('> span > a._lasform-array-deletelast')
                .addClass('disabled');
            }
      
            $('> span > a._lasform-array-deletelast', $nodeid).click(function (evt) {
              var idx = node.children.length - 1;
              evt.preventDefault();
              evt.stopPropagation();
              if (boundaries.minItems > 0) {
                if (node.children.length < boundaries.minItems + 2) {
                  $nodeid.find('> span > a._lasform-array-deletelast')
                    .addClass('disabled');
                }
                if (node.children.length <= boundaries.minItems) {
                  return false;
                }
              }
              else if (node.children.length === 1) {
                $nodeid.find('> span > a._lasform-array-deletelast')
                  .addClass('disabled');
              }
              node.deleteArrayItem(idx);
              if ((boundaries.maxItems >= 0) && (idx <= boundaries.maxItems - 1)) {
                $nodeid.find('> span > a._lasform-array-addmore')
                  .removeClass('disabled');
              }
            });
      
            if ($(node.el).sortable) {
              $('> ul', $nodeid).sortable();
              $('> ul', $nodeid).bind('sortstop', function (event, ui) {
                var idx = $(ui.item).data('idx');
                var newIdx = $(ui.item).index();
                moveNodeTo(idx, newIdx);
              });
            }
          }
        },
        'tabarray': {
          'template': '<div id="<%= id %>"><div class="tabbable tabs-left">' +
            '<ul class="nav nav-tabs">' +
              '<%= tabs %>' +
            '</ul>' +
            '<div class="tab-content">' +
              '<%= children %>' +
            '</div>' +
            '</div>' +
            '<a href="#" class="btn btn-default _lasform-array-addmore"><i class="glyphicon glyphicon-plus-sign" title="Add new"></i></a> ' +
            '<a href="#" class="btn btn-default _lasform-array-deleteitem"><i class="glyphicon glyphicon-minus-sign" title="Delete item"></i></a></div>',
          'fieldtemplate': true,
          'array': true,
          'childTemplate': function (inner) {
            return '<div data-idx="<%= node.childPos %>" class="tab-pane">' +
              inner +
              '</div>';
          },
          'onBeforeRender': function (data, node) {
            // Generate the initial 'tabs' from the children
            var tabs = '';
            _.each(node.children, function (child, idx) {
              var title = child.legend ||
                child.title ||
                ('Item ' + (idx+1));
              tabs += '<li data-idx="' + idx + '"' +
                ((idx === 0) ? ' class="active"' : '') +
                '><a class="draggable tab" data-toggle="tab">' +
                escapeHTML(title) +
                '</a></li>';
            });
            data.tabs = tabs;
          },
          'onInsert': function (evt, node) {
            var $nodeid = $(node.el).find('#' + escapeSelector(node.id));
            var boundaries = node.getArrayBoundaries();
      
            var moveNodeTo = function (fromIdx, toIdx) {
              // Note "switchValuesWith" extracts values from the DOM since field
              // values are not synchronized with the tree data structure, so calls
              // to render are needed at each step to force values down to the DOM
              // before next move.
              // TODO: synchronize field values and data structure completely and
              // call render only once to improve efficiency.
              if (fromIdx === toIdx) return;
              var incr = (fromIdx < toIdx) ? 1: -1;
              var i = 0;
              var tabEl = $('> .tabbable > .tab-content', $nodeid).get(0);
              for (i = fromIdx; i !== toIdx; i += incr) {
                node.children[i].switchValuesWith(node.children[i + incr]);
                node.children[i].render(tabEl);
                node.children[i + incr].render(tabEl);
              }
            };
      
      
            // Refreshes the list of tabs
            var updateTabs = function (selIdx) {
              var tabs = '';
              var activateFirstTab = false;
              if (selIdx === undefined) {
                selIdx = $('> .tabbable > .nav-tabs .active', $nodeid).data('idx');
                if (selIdx) {
                  selIdx = parseInt(selIdx, 10);
                }
                else {
                  activateFirstTab = true;
                  selIdx = 0;
                }
              }
              if (selIdx >= node.children.length) {
                selIdx = node.children.length - 1;
              }
              _.each(node.children, function (child, idx) {
                $('> .tabbable > .tab-content > [data-idx="' + idx + '"] > fieldset > legend', $nodeid).html(child.legend);
                var title = child.legend || child.title || ('Item ' + (idx+1));
                tabs += '<li data-idx="' + idx + '">' +
                        '<a class="draggable tab" data-toggle="tab">' +
                        escapeHTML(title) +
                        '</a></li>';
              });
              $('> .tabbable > .nav-tabs', $nodeid).html(tabs);
              if (activateFirstTab) {
                $('> .tabbable > .nav-tabs [data-idx="0"]', $nodeid).addClass('active');
              }
              $('> .tabbable > .nav-tabs [data-toggle="tab"]', $nodeid).eq(selIdx).click();
            };
      
            $('> a._lasform-array-deleteitem', $nodeid).click(function (evt) {
              var idx = $('> .tabbable > .nav-tabs .active', $nodeid).data('idx');
              evt.preventDefault();
              evt.stopPropagation();
              if (boundaries.minItems > 0) {
                if (node.children.length < boundaries.minItems + 1) {
                  $nodeid.find('> a._lasform-array-deleteitem')
                    .addClass('disabled');
                }
                if (node.children.length <= boundaries.minItems) return false;
              }
              node.deleteArrayItem(idx);
              updateTabs();
              if ((node.children.length < boundaries.minItems + 1) ||
                  (node.children.length === 0)) {
                $nodeid.find('> a._lasform-array-deleteitem').addClass('disabled');
              }
              if ((boundaries.maxItems >= 0) &&
                  (node.children.length <= boundaries.maxItems)) {
                $nodeid.find('> a._lasform-array-addmore').removeClass('disabled');
              }
            });
      
            $('> a._lasform-array-addmore', $nodeid).click(function (evt) {
              var idx = node.children.length;
              if (boundaries.maxItems>=0) {
                if (node.children.length>boundaries.maxItems-2) {
                  $('> a._lasform-array-addmore', $nodeid).addClass("disabled");
                }
                if (node.children.length > boundaries.maxItems - 1) {
                  return false;
                }
              }
              evt.preventDefault();
              evt.stopPropagation();
              node.insertArrayItem(idx,
                $nodeid.find('> .tabbable > .tab-content').get(0));
              updateTabs(idx);
              if ((boundaries.minItems <= 0) ||
                  ((boundaries.minItems > 0) && (idx > boundaries.minItems - 1))) {
                $nodeid.find('> a._lasform-array-deleteitem').removeClass('disabled');
              }
            });
      
            $(node.el).on('legendUpdated', function (evt) {
              updateTabs();
              evt.preventDefault();
              evt.stopPropagation();
            });
      
            if ($(node.el).sortable) {
              $('> .tabbable > .nav-tabs', $nodeid).sortable({
                containment: node.el,
                tolerance: 'pointer'
              });
              $('> .tabbable > .nav-tabs', $nodeid).bind('sortstop', function (event, ui) {
                var idx = $(ui.item).data('idx');
                var newIdx = $(ui.item).index();
                moveNodeTo(idx, newIdx);
                updateTabs(newIdx);
              });
            }
      
            // Simulate User's click to setup the form with its minItems
            if (boundaries.minItems >= 0) {
              for (var i = 0; i < (boundaries.minItems - 1); i++) {
                $nodeid.find('> a._lasform-array-addmore').click();
              }
              $nodeid.find('> a._lasform-array-deleteitem').addClass('disabled');
              updateTabs();
            }
      
            if ((boundaries.maxItems >= 0) &&
                (node.children.length >= boundaries.maxItems)) {
              $nodeid.find('> a._lasform-array-addmore').addClass('disabled');
            }
            if ((boundaries.minItems >= 0) &&
                (node.children.length <= boundaries.minItems)) {
              $nodeid.find('> a._lasform-array-deleteitem').addClass('disabled');
            }
          }
        },
        'help': {
          'template':'<span class="help-block" style="padding-top:5px"><%= elt.helpvalue %></span>',
          'fieldtemplate': true
        },
        'msg': {
          'template': '<%= elt.msg %>'
        },
        'fieldset': {
          'template': '<fieldset class="form-group lasform-error-<%= keydash %> <% if (elt.expandable) { %>expandable<% } %> <%= elt.htmlClass?elt.htmlClass:"" %>" ' +
            '<% if (id) { %> id="<%= id %>"<% } %>' +
            '>' +
            '<% if (node.title || node.legend) { %><legend><%= node.title || node.legend %></legend><% } %>' +
            '<% if (elt.expandable) { %><div class="form-group"><% } %>' +
            '<%= children %>' +
            '<% if (elt.expandable) { %></div><% } %>' +
            '</fieldset>',
          onInsert: function (evt, node) {
            $('.expandable > div, .expandable > fieldset', node.el).hide();
            // See #233 
            $(".expandable", node.el).removeClass("expanded");
          }
        },
        'advancedfieldset': {
          'template': '<fieldset' +
            '<% if (id) { %> id="<%= id %>"<% } %>' +
            ' class="expandable <%= elt.htmlClass?elt.htmlClass:"" %>">' +
            '<legend><%= (node.title || node.legend) ? (node.title || node.legend) : "Advanced options" %></legend>' +
            '<div class="form-group">' +
            '<%= children %>' +
            '</div>' +
            '</fieldset>',
          onInsert: function (evt, node) {
            $('.expandable > div, .expandable > fieldset', node.el).hide();
            // See #233 
            $(".expandable", node.el).removeClass("expanded");
          }
        },
        'authfieldset': {
          'template': '<fieldset' +
            '<% if (id) { %> id="<%= id %>"<% } %>' +
            ' class="expandable <%= elt.htmlClass?elt.htmlClass:"" %>">' +
            '<legend><%= (node.title || node.legend) ? (node.title || node.legend) : "Authentication settings" %></legend>' +
            '<div class="form-group">' +
            '<%= children %>' +
            '</div>' +
            '</fieldset>',
          onInsert: function (evt, node) {
            $('.expandable > div, .expandable > fieldset', node.el).hide();
            // See #233 
            $(".expandable", node.el).removeClass("expanded");
          }
        },
        'submit':{
          'template':'<input type="submit" <% if (id) { %> id="<%= id %>" <% } %> class="btn btn-primary <%= elt.htmlClass?elt.htmlClass:"" %>" value="<%= value || node.title %>"<%= (node.disabled? " disabled" : "")%>/>'
        },
        'button':{
          'template':' <button type="button" <% if (id) { %> id="<%= id %>" <% } %> class="btn btn-default <%= elt.htmlClass?elt.htmlClass:"" %>"><%= node.title %></button> '
        },
        'actions':{
          'template':'<div class="<%= elt.htmlClass?elt.htmlClass:"" %>"><%= children %></div>'
        },
        'hidden':{
          'template':'<input type="hidden" id="<%= id %>" name="<%= node.name %>" value="<%= escape(value) %>" />',
          'inputfield': true
        },
        'selectfieldset': {
          'template': '<fieldset class="tab-container <%= elt.htmlClass?elt.htmlClass:"" %>">' +
            '<% if (node.legend) { %><legend><%= node.legend %></legend><% } %>' +
            '<% if (node.formElement.key) { %><input type="hidden" id="<%= node.id %>" name="<%= node.name %>" value="<%= escape(value) %>" /><% } else { %>' +
              '<a id="<%= node.id %>"></a><% } %>' +
            '<div class="tabbable">' +
              '<div class="form-group<%= node.formElement.hideMenu ? " hide" : "" %>">' +
                '<% if (!elt.notitle) { %><label for="<%= node.id %>"><%= node.title ? node.title : node.name %></label><% } %>' +
                '<div class="controls"><%= tabs %></div>' +
              '</div>' +
              '<div class="tab-content">' +
                '<%= children %>' +
              '</div>' +
            '</div>' +
            '</fieldset>',
          'inputfield': true,
          'getElement': function (el) {
            return $(el).parent().get(0);
          },
          'childTemplate': function (inner) {
            return '<div data-idx="<%= node.childPos %>" class="tab-pane' +
              '<% if (node.active) { %> active<% } %>">' +
              inner +
              '</div>';
          },
          'onBeforeRender': function (data, node) {
            // Before rendering, this function ensures that:
            // 1. direct children have IDs (used to show/hide the tabs contents)
            // 2. the tab to active is flagged accordingly. The active tab is
            // the first one, except if form values are available, in which case
            // it's the first tab for which there is some value available (or back
            // to the first one if there are none)
            // 3. the HTML of the select field used to select tabs is exposed in the
            // HTML template data as "tabs"
      
            var children = null;
            var choices = [];
            if (node.schemaElement) {
              choices = node.schemaElement['enum'] || [];
            }
            if (node.options) {
              children = _.map(node.options, function (option, idx) {
                var child = node.children[idx];
                child.childPos = idx; // When nested the childPos is always 0.
                if (option instanceof Object) {
                  option = _.extend({ node: child }, option);
                  option.title = option.title ||
                    child.legend ||
                    child.title ||
                    ('Option ' + (child.childPos+1));
                  option.value = isSet(option.value) ? option.value :
                    isSet(choices[idx]) ? choices[idx] : idx;
                  return option;
                }
                else {
                  return {
                    title: option,
                    value: isSet(choices[child.childPos]) ?
                      choices[child.childPos] :
                      child.childPos,
                    node: child
                  };
                }
              });
            }
            else {
              children = _.map(node.children, function (child, idx) {
                return {
                  title: child.legend || child.title || ('Option ' + (child.childPos+1)),
                  value: choices[child.childPos] || child.childPos,
                  node: child
                };
              });
            }
      
            var activeChild = null;
            if (data.value) {
              activeChild = _.find(children, function (child) {
                return (child.value === node.value);
              });
            }
            if (!activeChild) {
              activeChild = _.find(children, function (child) {
                return child.node.hasNonDefaultValue();
              });
            }
            if (!activeChild) {
              activeChild = children[0];
            }
            activeChild.node.active = true;
            data.value = activeChild.value;
      
            var elt = node.formElement;
            var tabs = '<select class="nav"' +
              (node.disabled ? ' disabled' : '') +
              '>';
            _.each(children, function (child, idx) {
              tabs += '<option data-idx="' + idx + '" value="' + child.value + '"' +
                (child.node.active ? ' class="active"' : '') +
                '>' +
                escapeHTML(child.title) +
                '</option>';
            });
            tabs += '</select>';
      
            data.tabs = tabs;
            return data;
          },
          'onInsert': function (evt, node) {
            $(node.el).find('select.nav').first().on('change', function (evt) {
              var $option = $(this).find('option:selected');
              $(node.el).find('input[type="hidden"]').first().val($option.attr('value'));
            });
          }
        },
        'optionfieldset': {
          'template': '<div' +
            '<% if (node.id) { %> id="<%= node.id %>"<% } %>' +
            '>' +
            '<%= children %>' +
            '</div>'
        },
        'section': {
          'template': '<div' +
            '<% if (node.id) { %> id="<%= node.id %>"<% } %>' +
            '><%= children %></div>'
        }
      };

    

    var formNode = function () {
        /**
         * The node's ID (may not be set)
         */
        this.id = null;
        
        /**
         * The node's key path (may not be set)
         */
        this.key = null;
        
        /**
         * DOM element associated witht the form element.
         *
         * The DOM element is set when the form element is rendered.
         */
        this.el = null;
        
        /**
         * Link to the form element that describes the node's layout
         * (note the form element is shared among nodes in arrays)
         */
        this.formElement = null;
        
        /**
         * Link to the schema element that describes the node's value constraints
         * (note the schema element is shared among nodes in arrays)
         */
        this.schemaElement = null;
        
        /**
         * Pointer to the "view" associated with the node, typically the right
         * object in lasform.elementTypes
         */
        this.view = null;
        
        /**
         * Node's subtree (if one is defined)
         */
        this.children = [];
        
        /**
         * A pointer to the form tree the node is attached to
         */
        this.ownerTree = null;
        
        /**
         * A pointer to the parent node of the node in the tree
         */
        this.parentNode = null;
        
        /**
         * Child template for array-like nodes.
         *
         * The child template gets cloned to create new array items.
         */
        this.childTemplate = null;
        
        
        /**
         * Direct children of array-like containers may use the value of a
         * specific input field in their subtree as legend. The link to the
         * legend child is kept here and initialized in computeInitialValues
         * when a child sets "valueInLegend"
         */
        this.legendChild = null;
        
        
        /**
         * The path of indexes that lead to the current node when the
         * form element is not at the root array level.
         *
         * Note a form element may well be nested element and still be
         * at the root array level. That's typically the case for "fieldset"
         * elements. An array level only gets created when a form element
         * is of type "array" (or a derivated type such as "tabarray").
         *
         * The array path of a form element linked to the foo[2].bar.baz[3].toto
         * element in the submitted values is [2, 3] for instance.
         *
         * The array path is typically used to compute the right ID for input
         * fields. It is also used to update positions when an array item is
         * created, moved around or suppressed.
         *
         * @type {Array(Number)}
         */
        this.arrayPath = [];
        
        /**
         * Position of the node in the list of children of its parents
         */
        this.childPos = 0;
      };

    formNode.prototype.clone = function (parentNode) {
        var node = new formNode();
        node.arrayPath = _.clone(this.arrayPath);
        node.ownerTree = this.ownerTree;
        node.parentNode = parentNode || this.parentNode;
        node.formElement = this.formElement;
        node.schemaElement = this.schemaElement;
        node.view = this.view;
        node.children = _.map(this.children, function (child) {
        return child.clone(node);
        });
        if (this.childTemplate) {
        node.childTemplate = this.childTemplate.clone(node);
        }
        return node;
    };

    /**
     * Attaches a child node to the current node.
     *
     * The child node is appended to the end of the list.
     *
     * @function
     * @param {formNode} node The child node to append
     * @return {formNode} The inserted node (same as the one given as parameter)
     */
    formNode.prototype.appendChild = function (node) {
        node.parentNode = this;
        node.childPos = this.children.length;
        this.children.push(node);
        return node;
    };


    /**
     * Recursively sets values to all nodes of the current subtree
     * based on previously submitted values, or based on default
     * values when the submitted values are not enough
     *
     * The function should be called once in the lifetime of a node
     * in the tree. It expects its parent's arrayPath to be up to date.
     *
     * Three cases may arise:
     * 1. if the form element is a simple input field, the value is
     * extracted from previously submitted values of from default values
     * defined in the schema.
     * 2. if the form element is an array-like node, the child template
     * is used to create as many children as possible (and at least one).
     * 3. the function simply recurses down the node's subtree otherwise
     * (this happens when the form element is a fieldset-like element).
     *
     * @function
     * @param {Object} values Previously submitted values for the form
     * @param {Boolean} ignoreDefaultValues Ignore default values defined in the
     *  schema when set.
     */
    formNode.prototype.computeInitialValues = function (values, ignoreDefaultValues) {
        var self = this;
        var node = null;
        var nbChildren = 1;
        var i = 0;
        var formData = this.ownerTree.formDesc.tpldata || {};
    
        // Propagate the array path from the parent node
        // (adding the position of the child for nodes that are direct
        // children of array-like nodes)
        if (this.parentNode) {
        this.arrayPath = _.clone(this.parentNode.arrayPath);
        if (this.parentNode.view && this.parentNode.view.array) {
            this.arrayPath.push(this.childPos);
        }
        }
        else {
        this.arrayPath = [];
        }
    
        // Prepare special data param "idx" for templated values
        // (is is the index of the child in its wrapping array, starting
        // at 1 since that's more human-friendly than a zero-based index)
        formData.idx = (this.arrayPath.length > 0) ?
        this.arrayPath[this.arrayPath.length-1] + 1 :
        this.childPos + 1;
    
        // Prepare special data param "value" for templated values
        formData.value = '';
    
        // Prepare special function to compute the value of another field
        formData.getValue = function (key) {
        if (!values) {
            return '';
        }
        var returnValue = values;
        var listKey = key.split('[].');
        var i;
        for (i = 0; i < listKey.length - 1; i++) {
            returnValue = returnValue[listKey[i]][self.arrayPath[i]];
        }
        return returnValue[listKey[i]];
        };
    
        if (this.formElement) {
        // Compute the ID of the field (if needed)
        if (this.formElement.id) {
            this.id = applyArrayPath(this.formElement.id, this.arrayPath);
        }
        else if (this.view && this.view.array) {
            this.id = escapeSelector(this.ownerTree.formDesc.prefix) +
            '-elt-counter-' + _.uniqueId();
        }
        else if (this.parentNode && this.parentNode.view &&
            this.parentNode.view.array) {
            // Array items need an array to associate the right DOM element
            // to the form node when the parent is rendered.
            this.id = escapeSelector(this.ownerTree.formDesc.prefix) +
            '-elt-counter-' + _.uniqueId();
        }
        else if ((this.formElement.type === 'button') ||
            (this.formElement.type === 'selectfieldset') ||
            (this.formElement.type === 'question') ||
            (this.formElement.type === 'buttonquestion')) {
            // Buttons do need an id for "onClick" purpose
            this.id = escapeSelector(this.ownerTree.formDesc.prefix) +
            '-elt-counter-' + _.uniqueId();
        }
    
        // Compute the actual key (the form element's key is index-free,
        // i.e. it looks like foo[].bar.baz[].truc, so we need to apply
        // the array path of the node to get foo[4].bar.baz[2].truc)
        if (this.formElement.key) {
            this.key = applyArrayPath(this.formElement.key, this.arrayPath);
            this.keydash = slugify(this.key.replace(/\./g, '---'));
        }
    
        // Same idea for the field's name
        this.name = applyArrayPath(this.formElement.name, this.arrayPath);
    
        // Consider that label values are template values and apply the
        // form's data appropriately (note we also apply the array path
        // although that probably doesn't make much sense for labels...)
        _.each([
            'title',
            'legend',
            'description',
            'append',
            'prepend',
            'inlinetitle',
            'helpvalue',
            'value',
            'disabled',
            'placeholder',
            'readOnly'
        ], function (prop) {
            if (_.isString(this.formElement[prop])) {
            if (this.formElement[prop].indexOf('{{values.') !== -1) {
                // This label wants to use the value of another input field.
                // Convert that construct into {{lasform.getValue(key)}} for
                // Underscore to call the appropriate function of formData
                // when template gets called (note calling a function is not
                // exactly Mustache-friendly but is supported by Underscore).
                this[prop] = this.formElement[prop].replace(
                /\{\{values\.([^\}]+)\}\}/g,
                '{{getValue("$1")}}');
            }
            else {
                // Note applying the array path probably doesn't make any sense,
                // but some geek might want to have a label "foo[].bar[].baz",
                // with the [] replaced by the appropriate array path.
                this[prop] = applyArrayPath(this.formElement[prop], this.arrayPath);
            }
            if (this[prop]) {
                this[prop] = _.template(this[prop], valueTemplateSettings)(formData);
            }
            }
            else {
            this[prop] = this.formElement[prop];
            }
        }, this);
    
        // Apply templating to options created with "titleMap" as well
        if (this.formElement.options) {
            this.options = _.map(this.formElement.options, function (option) {
            var title = null;
            if (_.isObject(option) && option.title) {
                // See a few lines above for more details about templating
                // preparation here.
                if (option.title.indexOf('{{values.') !== -1) {
                title = option.title.replace(
                    /\{\{values\.([^\}]+)\}\}/g,
                    '{{getValue("$1")}}');
                }
                else {
                title = applyArrayPath(option.title, self.arrayPath);
                }
                return _.extend({}, option, {
                value: (isSet(option.value) ? option.value : ''),
                title: _.template(title, valueTemplateSettings)(formData)
                });
            }
            else {
                return option;
            }
            });
        }
        }
    
        if (this.view && this.view.inputfield && this.schemaElement) {
        // Case 1: simple input field
        if (values) {
            // Form has already been submitted, use former value if defined.
            // Note we won't set the field to its default value otherwise
            // (since the user has already rejected it)
            if (isSet(lasform.util.getObjKey(values, this.key))) {
            this.value = lasform.util.getObjKey(values, this.key);
            }
        }
        else if (!ignoreDefaultValues) {
            // No previously submitted form result, use default value
            // defined in the schema if it's available and not already
            // defined in the form element
            if (!isSet(this.value) && isSet(this.schemaElement['default'])) {
            this.value = this.schemaElement['default'];
            if (_.isString(this.value)) {
                if (this.value.indexOf('{{values.') !== -1) {
                // This label wants to use the value of another input field.
                // Convert that construct into {{lasform.getValue(key)}} for
                // Underscore to call the appropriate function of formData
                // when template gets called (note calling a function is not
                // exactly Mustache-friendly but is supported by Underscore).
                this.value = this.value.replace(
                    /\{\{values\.([^\}]+)\}\}/g,
                    '{{getValue("$1")}}');
                }
                else {
                // Note applying the array path probably doesn't make any sense,
                // but some geek might want to have a label "foo[].bar[].baz",
                // with the [] replaced by the appropriate array path.
                this.value = applyArrayPath(this.value, this.arrayPath);
                }
                if (this.value) {
                this.value = _.template(this.value, valueTemplateSettings)(formData);
                }
            }
            this.defaultValue = true;
            }
        }
        }
        else if (this.view && this.view.array) {
        // Case 2: array-like node
        nbChildren = 0;
        if (values) {
            nbChildren = this.getPreviousNumberOfItems(values, this.arrayPath);
        }
        // TODO: use default values at the array level when form has not been
        // submitted before. Note it's not that easy because each value may
        // be a complex structure that needs to be pushed down the subtree.
        // The easiest way is probably to generate a "values" object and
        // compute initial values from that object
        /*
        else if (this.schemaElement['default']) {
            nbChildren = this.schemaElement['default'].length;
        }
        */
        else if (nbChildren === 0) {
            // If form has already been submitted with no children, the array
            // needs to be rendered without children. If there are no previously
            // submitted values, the array gets rendered with one empty item as
            // it's more natural from a user experience perspective. That item can
            // be removed with a click on the "-" button.
            nbChildren = 1;
        }
        for (i = 0; i < nbChildren; i++) {
            this.appendChild(this.childTemplate.clone());
        }
        }
    
        // Case 3 and in any case: recurse through the list of children
        _.each(this.children, function (child) {
        child.computeInitialValues(values, ignoreDefaultValues);
        });
    
        // If the node's value is to be used as legend for its "container"
        // (typically the array the node belongs to), ensure that the container
        // has a direct link to the node for the corresponding tab.
        if (this.formElement && this.formElement.valueInLegend) {
        node = this;
        while (node) {
            if (node.parentNode &&
            node.parentNode.view &&
            node.parentNode.view.array) {
            node.legendChild = this;
            if (node.formElement && node.formElement.legend) {
                node.legend = applyArrayPath(node.formElement.legend, node.arrayPath);
                formData.idx = (node.arrayPath.length > 0) ?
                node.arrayPath[node.arrayPath.length-1] + 1 :
                node.childPos + 1;
                formData.value = isSet(this.value) ? this.value : '';
                node.legend = _.template(node.legend, valueTemplateSettings)(formData);
                break;
            }
            }
            node = node.parentNode;
        }
        }
    };

    /**
     * Renders the node.
     *
     * Rendering is done in three steps: HTML generation, DOM element creation
     * and insertion, and an enhance step to bind event handlers.
     *
     * @function
     * @param {Node} el The DOM element where the node is to be rendered. The
     *  node is inserted at the right position based on its "childPos" property.
     */
    formNode.prototype.render = function (el) {
        var html = this.generate();
        this.setContent(html, el);
        this.enhance();
    };


    /**
     * Generates the view's HTML content for the underlying model.
     *
     * @function
     */
    formNode.prototype.generate = function () {
        var data = {
        id: this.id,
        keydash: this.keydash,
        elt: this.formElement,
        schema: this.schemaElement,
        node: this,
        value: isSet(this.value) ? this.value : '',
        escape: escapeHTML
        };
        var template = null;
        var html = '';
    
        // Complete the data context if needed
        if (this.ownerTree.formDesc.onBeforeRender) {
        this.ownerTree.formDesc.onBeforeRender(data, this);
        }
        if (this.view.onBeforeRender) {
        this.view.onBeforeRender(data, this);
        }
    
        // Use the template that 'onBeforeRender' may have set,
        // falling back to that of the form element otherwise
        if (this.template) {
        template = this.template;
        }
        else if (this.formElement && this.formElement.template) {
        template = this.formElement.template;
        }
        else {
        template = this.view.template;
        }
    
        // Wrap the view template in the generic field template
        // (note the strict equality to 'false', needed as we fallback
        // to the view's setting otherwise)
        if ((this.fieldtemplate !== false) &&
        (this.fieldtemplate || this.view.fieldtemplate)) {
        template = lasform.fieldTemplate(template);
        }
    
        // Wrap the content in the child template of its parent if necessary.
        if (this.parentNode && this.parentNode.view &&
        this.parentNode.view.childTemplate) {
        template = this.parentNode.view.childTemplate(template);
        }
    
        // Prepare the HTML of the children
        var childrenhtml = '';
        _.each(this.children, function (child) {
        childrenhtml += child.generate();
        });
        data.children = childrenhtml;
    
        data.fieldHtmlClass = '';
        if (this.ownerTree &&
            this.ownerTree.formDesc &&
            this.ownerTree.formDesc.params &&
            this.ownerTree.formDesc.params.fieldHtmlClass) {
        data.fieldHtmlClass = this.ownerTree.formDesc.params.fieldHtmlClass;
        }
        if (this.formElement &&
            (typeof this.formElement.fieldHtmlClass !== 'undefined')) {
        data.fieldHtmlClass = this.formElement.fieldHtmlClass;
        }
        
    
        // Apply the HTML template
        html = _.template(template, fieldTemplateSettings)(data);
        return html;
    };

    /**
     * Inserts/Updates the HTML content of the node in the DOM.
     *
     * If the HTML is an update, the new HTML content replaces the old one.
     * The new HTML content is not moved around in the DOM in particular.
     *
     * The HTML is inserted at the right position in its parent's DOM subtree
     * otherwise (well, provided there are enough children, but that should always
     * be the case).
     *
     * @function
     * @param {string} html The HTML content to render
     * @param {Node} parentEl The DOM element that is to contain the DOM node.
     *  This parameter is optional (the node's parent is used otherwise) and
     *  is ignored if the node to render is already in the DOM tree.
     */
    formNode.prototype.setContent = function (html, parentEl) {
        var node = $(html);
        var parentNode = parentEl ||
        (this.parentNode ? this.parentNode.el : this.ownerTree.domRoot);
        var nextSibling = null;
    
        if (this.el) {
        // Replace the contents of the DOM element if the node is already in the tree
        $(this.el).replaceWith(node);
        }
        else {
        // Insert the node in the DOM if it's not already there
        nextSibling = $(parentNode).children().get(this.childPos);
        if (nextSibling) {
            $(nextSibling).before(node);
        }
        else {
            $(parentNode).append(node);
        }
        }
    
        // Save the link between the form node and the generated HTML
        this.el = node;
    
        // Update the node's subtree, extracting DOM elements that match the nodes
        // from the generated HTML
        this.updateElement(this.el);
    };
  
    /**
     * Updates the DOM element associated with the node.
     *
     * Only nodes that have ID are directly associated with a DOM element.
     *
     * @function
     */
    formNode.prototype.updateElement = function (domNode) {
        if (this.id) {
        this.el = $('#' + escapeSelector(this.id), domNode).get(0);
        if (this.view && this.view.getElement) {
            this.el = this.view.getElement(this.el);
        }
        if ((this.fieldtemplate !== false) &&
            this.view && this.view.fieldtemplate) {
            // The field template wraps the element two or three level deep
            // in the DOM tree, depending on whether there is anything prepended
            // or appended to the input field
            this.el = $(this.el).parent().parent();
            if (this.prepend || this.prepend) {
            this.el = this.el.parent();
            }
            this.el = this.el.get(0);
        }
        if (this.parentNode && this.parentNode.view &&
            this.parentNode.view.childTemplate) {
            // TODO: the child template may introduce more than one level,
            // so the number of levels introduced should rather be exposed
            // somehow in lasform.fieldtemplate.
            this.el = $(this.el).parent().get(0);
        }
        }
    
        _.each(this.children, function (child) {
        child.updateElement(this.el || domNode);
        });
    };

    /**
     * Enhances the view with additional logic, binding event handlers
     * in particular.
     *
     * The function also runs the "insert" event handler of the view and
     * form element if they exist (starting with that of the view)
     *
     * @function
     */
    formNode.prototype.enhance = function () {
        var node = this;
        var handlers = null;
        var handler = null;
        var formData = _.clone(this.ownerTree.formDesc.tpldata) || {};
    
        if (this.formElement) {
        // Check the view associated with the node as it may define an "onInsert"
        // event handler to be run right away
        if (this.view.onInsert) {
            this.view.onInsert({ target: $(this.el) }, this);
        }
    
        handlers = this.handlers || this.formElement.handlers;
    
        // Trigger the "insert" event handler
        handler = this.onInsert || this.formElement.onInsert;
        if (handler) {
            handler({ target: $(this.el) }, this);
        }
        if (handlers) {
            _.each(handlers, function (handler, onevent) {
            if (onevent === 'insert') {
                handler({ target: $(this.el) }, this);
            }
            }, this);
        }
    
        // No way to register event handlers if the DOM element is unknown
        // TODO: find some way to register event handlers even when this.el is not set.
        if (this.el) {
    
            // Register specific event handlers
            // TODO: Add support for other event handlers
            if (this.onChange)
            $(this.el).bind('change', function(evt) { node.onChange(evt, node); });
            if (this.view.onChange)
            $(this.el).bind('change', function(evt) { node.view.onChange(evt, node); });
            if (this.formElement.onChange)
            $(this.el).bind('change', function(evt) { node.formElement.onChange(evt, node); });
    
            if (this.onClick)
            $(this.el).bind('click', function(evt) { node.onClick(evt, node); });
            if (this.view.onClick)
            $(this.el).bind('click', function(evt) { node.view.onClick(evt, node); });
            if (this.formElement.onClick)
            $(this.el).bind('click', function(evt) { node.formElement.onClick(evt, node); });
    
            if (this.onKeyUp)
            $(this.el).bind('keyup', function(evt) { node.onKeyUp(evt, node); });
            if (this.view.onKeyUp)
            $(this.el).bind('keyup', function(evt) { node.view.onKeyUp(evt, node); });
            if (this.formElement.onKeyUp)
            $(this.el).bind('keyup', function(evt) { node.formElement.onKeyUp(evt, node); });
    
            if (handlers) {
            _.each(handlers, function (handler, onevent) {
                if (onevent !== 'insert') {
                $(this.el).bind(onevent, function(evt) { handler(evt, node); });
                }
            }, this);
            }
        }
    
        // Auto-update legend based on the input field that's associated with it
        if (this.legendChild && this.legendChild.formElement) {
            $(this.legendChild.el).bind('keyup', function (evt) {
            if (node.formElement && node.formElement.legend && node.parentNode) {
                node.legend = applyArrayPath(node.formElement.legend, node.arrayPath);
                formData.idx = (node.arrayPath.length > 0) ?
                node.arrayPath[node.arrayPath.length-1] + 1 :
                node.childPos + 1;
                formData.value = $(evt.target).val();
                node.legend = _.template(node.legend, valueTemplateSettings)(formData);
                $(node.parentNode.el).trigger('legendUpdated');
            }
            });
        }
        }
    
        // Recurse down the tree to enhance children
        _.each(this.children, function (child) {
        child.enhance();
        });
    };

    /**
     * Returns the structured object that corresponds to the form values entered
     * by the user for the node's subtree.
     *
     * The returned object follows the structure of the JSON schema that gave
     * birth to the form.
     *
     * Obviously, the node must have been rendered before that function may
     * be called.
     *
     * @function
     * @param {Array(Number)} updateArrayPath Array path to use to pretend that
     *  the entered values were actually entered for another item in an array
     *  (this is used to move values around when an item is inserted/removed/moved
     *  in an array)
     * @return {Object} The object that follows the data schema and matches the
     *  values entered by the user.
     */
    formNode.prototype.getFormValues = function (updateArrayPath) {
        // The values object that will be returned
        var values = {};
    
        if (!this.el) {
        throw new Error('formNode.getFormValues can only be called on nodes that are associated with a DOM element in the tree');
        }
    
        // Form fields values
        var formArray = $(':input', this.el).serializeArray();
    
        // Set values to false for unset checkboxes and radio buttons
        // because serializeArray() ignores them
        formArray = formArray.concat(
        $(':input[type=checkbox]:not(:disabled):not(:checked)', this.el).map( function() {
            return {"name": this.name, "value": this.checked}
        }).get()
        );
    
        if (updateArrayPath) {
        _.each(formArray, function (param) {
            param.name = applyArrayPath(param.name, updateArrayPath);
        });
        }
    
        // The underlying data schema
        var formSchema = this.ownerTree.formDesc.schema;
    
        for (var i = 0; i < formArray.length; i++) {
        // Retrieve the key definition from the data schema
        var name = formArray[i].name;
        var eltSchema = getSchemaKey(formSchema.properties, name);
        var arrayMatch = null;
        var cval = null;
    
        // Skip the input field if it's not part of the schema
        if (!eltSchema) continue;
    
        // Handle multiple checkboxes separately as the idea is to generate
        // an array that contains the list of enumeration items that the user
        // selected.
        if (eltSchema._lasform_checkboxes_as_array) {
            arrayMatch = name.match(/\[([0-9]*)\]$/);
            if (arrayMatch) {
            name = name.replace(/\[([0-9]*)\]$/, '');
            cval = lasform.util.getObjKey(values, name) || [];
            if (formArray[i].value === '1') {
                // Value selected, push the corresponding enumeration item
                // to the data result
                cval.push(eltSchema['enum'][parseInt(arrayMatch[1],10)]);
            }
            lasform.util.setObjKey(values, name, cval);
            continue;
            }
        }
    
        // Type casting
        if (eltSchema.type === 'boolean') {
            if (formArray[i].value === '0') {
            formArray[i].value = false;
            } else {
            formArray[i].value = !!formArray[i].value;
            }
        }
        if ((eltSchema.type === 'number') ||
            (eltSchema.type === 'integer')) {
            if (_.isString(formArray[i].value)) {
            if (!formArray[i].value.length) {
                formArray[i].value = null;
            } else if (!isNaN(Number(formArray[i].value))) {
                formArray[i].value = Number(formArray[i].value);
            }
            }
        }
        if ((eltSchema.type === 'string') &&
            (formArray[i].value === '') &&
            !eltSchema._lasform_allowEmpty) {
            formArray[i].value=null;
        }
        if ((eltSchema.type === 'object') &&
            _.isString(formArray[i].value) &&
            (formArray[i].value.substring(0,1) === '{')) {
            try {
            formArray[i].value = JSON.parse(formArray[i].value);
            } catch (e) {
            formArray[i].value = {};
            }
        }
        //TODO is this due to a serialization bug?
        if ((eltSchema.type === 'object') &&
            (formArray[i].value === 'null' || formArray[i].value === '')) {
            formArray[i].value = null;
        }
    
        if (formArray[i].name && (formArray[i].value !== null)) {
            lasform.util.setObjKey(values, formArray[i].name, formArray[i].value);
        }
        }
        // console.log("Form value",values);
        return values;
    };

    var formTree = function () {
        this.eventhandlers = [];
        this.root = null;
        this.formDesc = null;
    };


    /**
     * Initializes the form tree structure from the lasform object
     *
     * This function is the main entry point of the lasform library.
     *
     * Initialization steps:
     * 1. the internal tree structure that matches the lasform object
     *  gets created (call to buildTree)
     * 2. initial values are computed from previously submitted values
     *  or from the default values defined in the JSON schema.
     *
     * When the function returns, the tree is ready to be rendered through
     * a call to "render".
     *
     * @function
     */
    formTree.prototype.initialize = function (formDesc) {
        formDesc = formDesc || {};
    
        // Keep a pointer to the initial lasform
        // (note clone returns a shallow copy, only first-level is cloned)
        this.formDesc = _.clone(formDesc);
    
        // Compute form prefix if no prefix is given.
        this.formDesc.prefix = this.formDesc.prefix ||
        'lasform-' + _.uniqueId();
    
        // JSON schema shorthand
        if (this.formDesc.schema && !this.formDesc.schema.properties) {
        this.formDesc.schema = {
            properties: this.formDesc.schema
        };
        }
    
        // Ensure layout is set
        this.formDesc.form = this.formDesc.form || [
        '*',
        {
            type: 'actions',
            items: [
            {
                type: 'submit',
                value: 'Submit'
            }
            ]
        }
        ];
        this.formDesc.form = (_.isArray(this.formDesc.form) ?
        this.formDesc.form :
        [this.formDesc.form]);

        submitFlag = _.find(this.formDesc.form, function(el){ if (el.type == 'actions' || el.type == 'submit') return true; });
        if (!submitFlag){
            this.formDesc.form.push({
                type: 'actions',
                items: [
                {
                    type: 'submit',
                    value: 'Submit'
                }
                ]
            })
        };


    
        this.formDesc.params = this.formDesc.params || {};
    
        // Create the root of the tree
        this.root = new formNode();
        this.root.ownerTree = this;
        this.root.view = lasform.elementTypes['root'];
    
        // Generate the tree from the form description
        this.buildTree();
    
        // Compute the values associated with each node
        // (for arrays, the computation actually creates the form nodes)
        this.computeInitialValues();
    };

    formTree.prototype.buildTree = function () {
        // Parse and generate the form structure based on the elements encountered:
        // - '*' means "generate all possible fields using default layout"
        // - a key reference to target a specific data element
        // - a more complex object to generate specific form sections
        _.each(this.formDesc.form, function (formElement) {
          if (formElement === '*') {
            _.each(this.formDesc.schema.properties, function (element, key) {
              this.root.appendChild(this.buildFromLayout({
                key: key
              }));
            }, this);
          }
          else {
            if (_.isString(formElement)) {
              formElement = {
                key: formElement
              };
            }
            this.root.appendChild(this.buildFromLayout(formElement));
          }
        }, this);
    };

    formTree.prototype.buildFromLayout = function (formElement, context) {
        var schemaElement = null;
        var node = new formNode();
        var view = null;
        var key = null;
      
        // The form element parameter directly comes from the initial
        // lasform object. We'll make a shallow copy of it and of its children
        // not to pollute the original object.
        // (note JSON.parse(JSON.stringify()) cannot be used since there may be
        // event handlers in there!)
        formElement = _.clone(formElement);
        if (formElement.items) {
          if (_.isArray(formElement.items)) {
            formElement.items = _.map(formElement.items, _.clone);
          }
          else {
            formElement.items = [ _.clone(formElement.items) ];
          }
        }
      
        if (formElement.key) {
          // The form element is directly linked to an element in the JSON
          // schema. The properties of the form element override those of the
          // element in the JSON schema. Properties from the JSON schema complete
          // those of the form element otherwise.
      
          // Retrieve the element from the JSON schema
          schemaElement = getSchemaKey(
            this.formDesc.schema.properties,
            formElement.key);
          if (!schemaElement) {
            // The JSON Form is invalid!
            throw new Error('The lasform object references the schema key "' +
              formElement.key + '" but that key does not exist in the JSON schema');
          }
      
          // Schema element has just been found, let's trigger the
          // "onElementSchema" event
          // (tidoust: not sure what the use case for this is, keeping the
          // code for backward compatibility)
          if (this.formDesc.onElementSchema) {
            this.formDesc.onElementSchema(formElement, schemaElement);
          }
      
          formElement.name =
            formElement.name ||
            formElement.key;
          formElement.title =
            formElement.title ||
            schemaElement.title;
          formElement.description =
            formElement.description ||
            schemaElement.description;
          formElement.readOnly =
            formElement.readOnly ||
            schemaElement.readOnly ||
            formElement.readonly ||
            schemaElement.readonly;
      
          // Compute the ID of the input field
          if (!formElement.id) {
            formElement.id = escapeSelector(this.formDesc.prefix) +
              '-elt-' + slugify(formElement.key);
          }
      
          // Should empty strings be included in the final value?
          // TODO: it's rather unclean to pass it through the schema.
          if (formElement.allowEmpty) {
            schemaElement._lasform_allowEmpty = true;
          }
      
          // If the form element does not define its type, use the type of
          // the schema element.
          if (!formElement.type) {
            // If schema type is an array containing only a type and "null",
            // remove null and make the element non-required
            if (_.isArray(schemaElement.type)) {
              if (_.contains(schemaElement.type, "null")) {
                schemaElement.type = _.without(schemaElement.type, "null");
                schemaElement.required = false;
              }
              if (schemaElement.type.length > 1) {
                throw new Error("Cannot process schema element with multiple types.");
              }
              schemaElement.type = _.first(schemaElement.type);
            }
      
            if ((schemaElement.type === 'string') &&
              (schemaElement.format === 'color')) {
              formElement.type = 'color';
            } else if ((schemaElement.type === 'number' ||
              schemaElement.type === 'integer') &&
              !schemaElement['enum']) {
             formElement.type = 'number';
            } else if ((schemaElement.type === 'string' ||
              schemaElement.type === 'any') &&
              !schemaElement['enum']) {
              formElement.type = 'text';
            } else if (schemaElement.type === 'boolean') {
              formElement.type = 'checkbox';
            } else if (schemaElement.type === 'object') {
              if (schemaElement.properties) {
                formElement.type = 'fieldset';
              } else {
                formElement.type = 'textarea';
              }
            } else if (!_.isUndefined(schemaElement['enum'])) {
              formElement.type = 'select';
            } else {
              formElement.type = schemaElement.type;
            }
          }
      
          // Unless overridden in the definition of the form element (or unless
          // there's a titleMap defined), use the enumeration list defined in
          // the schema
          if (!formElement.options && schemaElement['enum']) {
            if (formElement.titleMap) {
              formElement.options = _.map(schemaElement['enum'], function (value) {
                return {
                  value: value,
                  title: hasOwnProperty(formElement.titleMap, value) ? formElement.titleMap[value] : value
                };
              });
            }
            else {
              formElement.options = schemaElement['enum'];
            }
          }
      
          // Flag a list of checkboxes with multiple choices
          if ((formElement.type === 'checkboxes') && schemaElement.items) {
            var itemsEnum = schemaElement.items['enum'];
            if (itemsEnum) {
              schemaElement.items._lasform_checkboxes_as_array = true;
            }
            if (!itemsEnum && schemaElement.items[0]) {
              itemsEnum = schemaElement.items[0]['enum'];
              if (itemsEnum) {
                schemaElement.items[0]._lasform_checkboxes_as_array = true;
              }
            }
          }
      
          // If the form element targets an "object" in the JSON schema,
          // we need to recurse through the list of children to create an
          // input field per child property of the object in the JSON schema
          if (schemaElement.type === 'object') {
            _.each(schemaElement.properties, function (prop, propName) {
              node.appendChild(this.buildFromLayout({
                key: formElement.key + '.' + propName
              }));
            }, this);
          }
        }
      
        if (!formElement.type) {
          formElement.type = 'none';
        }
        view = lasform.elementTypes[formElement.type];
        if (!view) {
          throw new Error('The lasform contains an element whose type is unknown: "' +
            formElement.type + '"');
        }
      
      
        if (schemaElement) {
          // The form element is linked to an element in the schema.
          // Let's make sure the types are compatible.
          // In particular, the element must not be a "container"
          // (or must be an "object" or "array" container)
          if (!view.inputfield && !view.array &&
            (formElement.type !== 'selectfieldset') &&
            (schemaElement.type !== 'object')) {
            throw new Error('The lasform contains an element that links to an ' +
              'element in the JSON schema (key: "' + formElement.key + '") ' +
              'and that should not based on its type ("' + formElement.type + '")');
          }
        }
        else {
          // The form element is not linked to an element in the schema.
          // This means the form element must be a "container" element,
          // and must not define an input field.
          if (view.inputfield && (formElement.type !== 'selectfieldset')) {
            throw new Error('The lasform defines an element of type ' +
              '"' + formElement.type + '" ' +
              'but no "key" property to link the input field to the JSON schema');
          }
        }
      
        // A few characters need to be escaped to use the ID as jQuery selector
        formElement.iddot = escapeSelector(formElement.id || '');
      
        // Initialize the form node from the form element and schema element
        node.formElement = formElement;
        node.schemaElement = schemaElement;
        node.view = view;
        node.ownerTree = this;
      
        // Set event handlers
        if (!formElement.handlers) {
          formElement.handlers = {};
        }
      
        // Parse children recursively
        if (node.view.array) {
          // The form element is an array. The number of items in an array
          // is by definition dynamic, up to the form user (through "Add more",
          // "Delete" commands). The positions of the items in the array may
          // also change over time (through "Move up", "Move down" commands).
          //
          // The form node stores a "template" node that serves as basis for
          // the creation of an item in the array.
          //
          // Array items may be complex forms themselves, allowing for nesting.
          //
          // The initial values set the initial number of items in the array.
          // Note a form element contains at least one item when it is rendered.
          if (formElement.items) {
            key = formElement.items[0] || formElement.items;
          }
          else {
            key = formElement.key + '[]';
          }
          if (_.isString(key)) {
            key = { key: key };
          }
          node.setChildTemplate(this.buildFromLayout(key));
        }
        else if (formElement.items) {
          // The form element defines children elements
          _.each(formElement.items, function (item) {
            if (_.isString(item)) {
              item = { key: item };
            }
            node.appendChild(this.buildFromLayout(item));
          }, this);
        }
      
        return node;
    };

    /**
     * Computes the values associated with each input field in the tree based
     * on previously submitted values or default values in the JSON schema.
     *
     * For arrays, the function actually creates and inserts additional
     * nodes in the tree based on previously submitted values (also ensuring
     * that the array has at least one item).
     *
     * The function sets the array path on all nodes.
     * It should be called once in the lifetime of a form tree right after
     * the tree structure has been created.
     *
     * @function
     */
    formTree.prototype.computeInitialValues = function () {
        this.root.computeInitialValues(this.formDesc.value);
    };


    /**
     * Renders the form tree
     *
     * @function
     * @param {Node} domRoot The "form" element in the DOM tree that serves as
     *  root for the form
     */
    formTree.prototype.render = function (domRoot) {
        if (!domRoot) return;
        this.domRoot = domRoot;
        this.root.render();
    
        // If the schema defines required fields, flag the form with the
        // "lasform-hasrequired" class for styling purpose
        // (typically so that users may display a legend)
        if (this.hasRequiredField()) {
        $(domRoot).addClass('lasform-hasrequired');
        }
    };


    /**
     * Returns true if the form displays a "required" field.
     *
     * To keep things simple, the function parses the form's schema and returns
     * true as soon as it finds a "required" flag even though, in theory, that
     * schema key may not appear in the final form.
     *
     * Note that a "required" constraint on a boolean type is always enforced,
     * the code skips such definitions.
     *
     * @function
     * @return {boolean} True when the form has some required field,
     *  false otherwise.
     */
    formTree.prototype.hasRequiredField = function () {
        var parseElement = function (element) {
        if (!element) return null;
        if (element.required && (element.type !== 'boolean')) {
            return element;
        }
    
        var prop = _.find(element.properties, function (property) {
            return parseElement(property);
        });
        if (prop) {
            return prop;
        }
    
        if (element.items) {
            if (_.isArray(element.items)) {
            prop = _.find(element.items, function (item) {
                return parseElement(item);
            });
            }
            else {
            prop = parseElement(element.items);
            }
            if (prop) {
            return prop;
            }
        }
        };
    
        return parseElement(this.formDesc.schema);
    };

    /**
     * Walks down the element tree with a callback
     *
     * @function
     * @param {Function} callback The callback to call on each element
     */
    formTree.prototype.forEachElement = function (callback) {

        var f = function(root) {
        for (var i=0;i<root.children.length;i++) {
            callback(root.children[i]);
            f(root.children[i]);
        }
        };
        f(this.root);
    
    };

    formTree.prototype.validate = function(noErrorDisplay) {

        var values = lasform.getFormValue(this.domRoot);
        var errors = false;
      
        var options = this.formDesc;
      
        if (options.validate!==false) {
          var validator = false;
          /*
          if (typeof options.validate!="object") {
            if (global.JSONFormValidator) {
              validator = global.JSONFormValidator.createEnvironment("json-schema-draft-03");
            }
          } else {
            validator = options.validate;
          }
          */
          if (validator) {
            var v = validator.validate(values, this.formDesc.schema);
            $(this.domRoot).lasformErrors(false,options);
            if (v.errors.length) {
              if (!errors) errors = [];
              errors = errors.concat(v.errors);
            }
          }
        }
      
        if (errors && !noErrorDisplay) {
          if (options.displayErrors) {
            options.displayErrors(errors,this.domRoot);
          } else {
            $(this.domRoot).lasformErrors(errors,options);
          }
        }
      
        return {"errors":errors}
      
      }

    formTree.prototype.submit = function(evt) {

        var stopEvent = function() {
          if (evt) {
            evt.preventDefault();
            evt.stopPropagation();
          }
          return false;
        };
        var values = lasform.getFormValue(this.domRoot);
        console.log(values);
        var options = this.formDesc;
      
        var brk=false;
        this.forEachElement(function(elt) {
          if (brk) return;
          if (elt.view.onSubmit) {
            brk = !elt.view.onSubmit(evt, elt); //may be called multiple times!!
          }
        });
      
        if (brk) return stopEvent();
      
        var validated = this.validate();

      
        if (options.onSubmit && !options.onSubmit(validated.errors,values)) {
          return stopEvent();
        }
      
        if (validated.errors) return stopEvent();
      
        if (options.onSubmitValid && !options.onSubmitValid(values)) {
          return stopEvent();
        }
      
        return false;
      
    };


    $.fn.lasForm = function(options) {
        var defaults = {submitEvent: 'submit'};

        var settings = $.extend({}, defaults, options);
        
        if (this.length > 1) {
            this.each(function() { $(this).lasForm(options) });
            return this;
        }
        var formElt = this;

        this.initialize = function() {
            var form = new formTree();
            console.log(settings);

            if (settings.hasOwnProperty('schema')){

                form.initialize(settings);
                this.empty();
                form.render(formElt.get(0));
        
                formElt.data("lasform-tree", form);
        
                if (settings.submitEvent) {
                    formElt.unbind((settings.submitEvent)+'.lasform');
                    formElt.bind((settings.submitEvent)+'.lasform', function(evt) {
                        form.submit(evt);
                    });
                }
            }
    
            return;
        }

        this.setOptions = function(options) {
            settings = $.extend({}, defaults, options);
            console.log(settings);
            this.initialize();
        }

        this.updateSchema = function(schema) {
            settings['schema'] = schema;
            settings['form'] = ['*'];
            console.log(settings)
            this.initialize();
        }

        this.updateForm = function(form){
            settings['form'] = form;
            console.log(settings)
            this.initialize();
        }


        this.onSubmit = function(f){
            settings.onSubmit = f;
            this.initialize();
        }
        
        
        this.initialize();
        
        return this;
    }

    /**
     * Highlights errors reported by the JSON schema validator in the document.
     *
     * @function
     * @param {Object} errors List of errors reported by the JSON schema validator
     * @param {Object} options The JSON Form object that describes the form
     *  (unused for the time being, could be useful to store example values or
     *   specific error messages)
     */
    $.fn.lasformErrors = function(errors, options) {
        $(".error", this).removeClass("error");
        $(".warning", this).removeClass("warning");
    
        $(".lasform-errortext", this).hide();
        if (!errors) return;
    
        var errorSelectors = [];
        for (var i = 0; i < errors.length; i++) {
        // Compute the address of the input field in the form from the URI
        // returned by the JSON schema validator.
        // These URIs typically look like:
        //  urn:uuid:cccc265e-ffdd-4e40-8c97-977f7a512853#/pictures/1/thumbnail
        // What we need from that is the path in the value object:
        //  pictures[1].thumbnail
        // ... and the jQuery-friendly class selector of the input field:
        //  .lasform-error-pictures\[1\]---thumbnail
        var key = errors[i].uri
            .replace(/.*#\//, '')
            .replace(/\//g, '.')
            .replace(/\.([0-9]+)(?=\.|$)/g, '[$1]');
        var errormarkerclass = ".lasform-error-" +
            escapeSelector(key.replace(/\./g,"---"));
        errorSelectors.push(errormarkerclass);
    
        var errorType = errors[i].type || "error";
        $(errormarkerclass, this).addClass(errorType);
        $(errormarkerclass + " .lasform-errortext", this).html(errors[i].message).show();
        }
    
        // Look for the first error in the DOM and ensure the element
        // is visible so that the user understands that something went wrong
        errorSelectors = errorSelectors.join(',');
        var firstError = $(errorSelectors).get(0);
        if (firstError && firstError.scrollIntoView) {
        firstError.scrollIntoView(true, {
            behavior: 'smooth'
        });
        }
    };
})(jQuery);