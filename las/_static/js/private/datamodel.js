$(document).ready(function () {
    features = []
    // display loaded file in the input form
    $('.custom-file-input').on('change', function () {
        let fileName = $(this).val().split('\\').pop();
        $(this).next('.custom-file-label').addClass("selected").html(fileName);
    });

    // filer entities
    var customFilter = function (t,s) {
        var val = $.trim(t.val()).replace(/ +/g, ' ').toLowerCase();
        var $rows = s; // $(".entities-list dt");
        $rows.show().filter(function () {
            var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
            return !~text.indexOf(val); // i.e., text.indexOf(val) === -1
        }).hide();
    }


    $('#entityFilter').keyup(function() {
        customFilter($(this), $(".entities-list dt"));
    });


    $('#treeFilter').keyup(function() {
        customFilter($(this), $(".entities-list td"));
    });

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