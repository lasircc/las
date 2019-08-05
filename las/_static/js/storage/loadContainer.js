$(document).ready(function () {
    pageData = LASData.init({ 
    'summary': {
        'div': 'divsum',
        'header': [{"title": "Type", "data": "@type"}, {"title": "Geometry", "data": "dim", "render": function ( data, type, row, meta ) {
            return data.x + 'X' + data.y;
          }}],
        /*
          'deleteCb': function(logid){
            console.log('summarycallback', logid);
        }
        */
    },
    'db': viewName,
    'finish': {'div': 'finish', 'href':'/storage/'}
    });


    
    form = $('#singleContainer').lasForm();
    form.setOptions({
        "schema": {
            "@type":{
                "title": "Container type",
                "type": "string",
                "required": true
            },
            "identifier": {
              "title": "Barcode",
              "type": "string",
              "required": true,
            },
            "dim":{
                "type": "object",
                "title": "Geometry",
                "properties": {
                    "x": {
                        "title": "x",
                        "type": "integer",
                        "required": true,
                        
                    },
                    "y": {
                        "title": "y",
                        "type": "integer",
                        "required": true
                    }
                }
            },
            "disposable": {
              "title": "Disposable",
              "type": "boolean",
            }
          },
          "form": [
            '*',
            {"key": "dim.x",
            "disabled": true
            },
            {   
                "key": "dim.y",
                "disabled": true
            },
            {
                "key": "@type",
                "type": "typeahead",
                
                "event": {
                    source: {data:[ {"name":"Plate1", "_id": "plate1", "dim": {"x": 4, "y": 6}}, {"name":"Tube", "_id": "tube", "dim": {"x": 1, "y": 1} } ]},
                    display: ['name'],
                    minLength: 1,
                    //template: "{{display}} <small style='color:#999;'>{{group}}</small>",
                    callback:  {
                        onClickAfter: function (node, a, item, event) {
                            //event.preventDefault();
                            console.log(node, a, item, event);
                            $('#singleContainer [name="dim.x"]').val(item.dim.x);
                            $('#singleContainer [name="dim.y"]').val(item.dim.y);
                        }
                    }
                }
            }
            ],
        onSubmit: function (errors, values) {
            console.log(errors, values)
            node = values;
            node['status'] = 'new';
            LASData.addEntity(node).then(function(data){
                console.log(data)
                LASData.addLog(values);
                $('#singleContainer [name="identifier"]').val('');
            });            
            return;
        }
      });

      

      

    
});