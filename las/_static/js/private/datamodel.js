$(document).ready(function () {
    features = [];

    editor = ace.edit("editorJsonSchema");
    editor.setTheme("ace/theme/twilight");
    editor.session.setMode("ace/mode/json");

    $('#formSchema').on('submit', function(){
        $('#formSchema input[name="json-schema"]').val( editor.getValue());
        return true;
    })

    $('input[name="schemaSearch"]').typeahead({
        display: ['slug'],
        minLength: 1,
        dynamic: true,
        searchOnFocus: true,
        mustSelectItem:true,
        emptyTemplate: 'No result for "{{query}}"',
        source: {
            schemas:{
            ajax: {
                url: "/entity/entities/schemas/",
                path: 'recordsTotal.data',
                data: {
                "q": "{{query}}",
                "prop": "slug"
                }
            }
            }
        },
        callback: {
            onClickAfter: function (node, a, item, event) {
                $('#schemaUri').val(item['_id'])
                
            },
            onCancel: function(node, item, event){
                $('#schemaUri').val('')
                $('#featList').empty();
            }
        }
    })

    $('#tableSchemas').dataTable();
    $('#tableEntities').dataTable();

    $('#getSchema').on('click', function(){

        $.ajax({
            type: 'get',
            url: '/private/datamodel/getSchemaFeatures/',
            data : {
                'oid': $('#schemaUri').val()
            }

        }).done(function(response){
            features = response['data'];
            $('#featList').empty();
            for (var i=0; i< features.length; i++){
                //{path: "features.student_id", type: "string", required: true}
                feat = features[i]
                htmlEl = '<li class="list-group-item">'
                htmlEl += '<span style="display:none" data-id="'+ i + '"></span>'
                htmlEl += '<b>' + feat['path'] + '</b> (' + feat['type'] + ')'
                if (feat.hasOwnProperty('required')){
                    if (feat['required'])
                        htmlEl += '*'
                }
                
                switch(feat['type']){
                    case 'string':
                        htmlEl += '<div class="form-group"><label>Default value</label><input class="form-control" type="text" name="feat' + i + '"></div>' 
                        break;
                    case 'number':
                        htmlEl += '<div class="form-group"><label>Default value</label><input class="form-control"<input type="number" name="feat' + i + '"></div>'
                        break;

                }
                htmlEl+= '</li>'

                $('#featList').append(htmlEl)

            }
            
        });

    })

    $('#createEntity').on('submit', function(){
        elems = $('#featList .list-group-item');
        newFeatures = []
        for (var i=0; i< elems.length; i++){
            el = elems[i];
            idF = $(el).children('span').data('id')
            inputDefault = $(el).find('input');
            if (inputDefault.length){
                defaultValue = $(inputDefault).val();
                feat = features[idF]
                if (defaultValue != ""){
                    feat['default'] = defaultValue;
                }
                newFeatures.push(feat);
            }
            else{
                newFeatures.push(features[idF])
            }
            

        }
        //$(this).append('<input type="hidden" name="field_name" value="value" /> ');
        
        $('#featuresList').val(JSON.stringify(newFeatures))
        return true;
    })


});