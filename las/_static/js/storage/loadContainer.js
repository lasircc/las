$(document).ready(function () {
    pageData = LASData.init({ 
    'summary': 'divsum',
    'db': viewName
    });

    
    
    form = $('#singleContainer').lasForm();
    form.setOptions({
        "schema": {
            "@type":{
                "title": "Container type",
                "type": "string",
                "required": true
            },
            "barcode": {
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
            {"key": "dim.y",
            "disabled": true
            },
            {"key": "@type",
            "type": "typeahead",
            "event": {
                source: [{"_id": "plate1", "name":"Plate1", "dim": {"x": 4, "y": 6}}, {"_id": "tube", "name":"Tube", "dim": {"x": 1, "y": 1}}],
                onSelect: function(item) {
                    console.log(item);
                    $()
                 }
                }
            }
          ],
        onSubmit: function (errors, values) {
            console.log(errors, values)
          
        }
      });

      $('#testLasForm').on ('click', function(){
            form.onSubmit(function(){
                console.log('Ciao')
            });
      })

      

      

    
});