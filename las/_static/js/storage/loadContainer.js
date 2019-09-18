$(document).ready(function () {

    currentNode = undefined;
    parentNode = undefined;

    pageData = LASData.init({ 
    'summary': {
        'div': 'divsum',
        'header': [{"title": "Barcode", "data": "features.barcode"}, {"title": "Type", "data": "_type"}, {"title": "Geometry", "data": "features.dim", "render": function ( data, type, row, meta ) {
            return data.x + 'X' + data.y;
          }}],
        /*
          'deleteCb': function(logid){
            console.log('summarycallback', logid);
        }
        */
    },
    'db': viewName
    });

    /*

    LASContainer.init([
      {'id': 'posContainer', 
      'type': 'pos', 
      'generate': false, 
      'aliqType': [{'label':'Viable', 'code': 'VT'}]}
      ], pageData);
    */


    
    form = $('#singleContainer').lasForm();

    form.setOptions({
        "schema": {
            "_type":{
                "title": "Container type",
                "type": "string",
                "required": true
            },
            "features": {
              "type": "object",
              "title": "Info",
              "properties":{
                "barcode": {
                  "title": "Barcode",
                  "type": "string",
                  "required": true,
                },
                "disposable": {
                  "title": "Disposable",
                  "type": "boolean",
                }
              }
            },
            "position": {
              "title": "Position now",
              "type": "boolean",
            }
          },
          "form": [
            '*',
            /*
            { 
              "type": "button",
              "title": "Click me",
              "htmlClass": "btn-info",
              "onClick": function (evt) {
                evt.preventDefault();
                
              }

            },*/
            {
                "key": "_type",
                "type": "typeahead",
                "event": {
                    source: {data:[ {"name":"Plate1", "_id": "plate1", "dim": {"x": 4, "y": 6}}, {"name":"Tube", "_id": "tube", "dim": {"x": 1, "y": 1} } ]},
                    display: ['name'],
                    minLength: 1,
                    /*template: "{{display}} <small style='color:#999;'>{{group}}</small>",
                    callback:  {
                        onClickAfter: function (node, a, item, event) {
                            //event.preventDefault();
                            console.log(node, a, item, event);
                            $('#singleContainer [name="dim.x"]').val(item.dim.x);
                            $('#singleContainer [name="dim.y"]').val(item.dim.y);
                        }
                    }
                    */
                }
            }
            ],
        onSubmit: function (errors, values) {
            console.log(errors, values)
            positioning = values['position']
            node = values;
            delete node['position'];
            LASData.insertOne('entity', node, false ).then(function(data){
                console.log(data, positioning)
                if (positioning == true ){
                  $('#posContainer').show();
                  currentNode = data;
                  //LASData.addSummary(data);
                  $('#singleContainer [name="features.barcode"]').val('');
                  $('#posContainer [name="child"]').val(data['features']['barcode']);
                }
                else{
                  sumData = data
                  sumData['father'] = '';
                  sumData['pos'] = '';
                  LASData.addSummary(sumData);
                }
                
            });
            return;
        }
      });


    form = $('#posContainer').lasForm();

    form.setOptions({
        "schema": {
            "child": {
              "title": "Father",
              "type": "string",
              "required": true
            },
            "father":{
                "title": "Father",
                "type": "string",
                "required": true
                
            },
            "pos":{
              "title": "Position",
              "type": "string",
              "required": true
            }
          },
          "form": [
            '*',
            {
              "key": "child",
              "disabled": true
            },
            {
                "key": "father",
                "type": "typeahead",
                "event": {
                    display: ['features.barcode'],
                    minLength: 1,
                    dynamic: true,
                    source: {
                      container:{
                        ajax: {
                          url: "/entity/entities/entity/",
                          path: 'recordsTotal.data',
                          data: {
                            "q": "{{query}}",
                            "prop": "features.barcode"
                          }
                        }
                      }
                    },
                    
                    callback:  {
                        onClickAfter: function (node, a, item, event) {
                            //event.preventDefault();
                            console.log(node, a, item, event);
                            LASData.insertOne('entity', item, true ).then(function(data){
                              console.log(data)
                              parentNode = data;
                            })
                        },
                        onCancel: function(node, item, event){
                          console.log('cancel typeahead');
                          LASData.deleteOne('entity', parentNode["_id"]["$oid"]).then(function(){
                            parentNode = undefined;
                          })
                      }
                    }
                    
                }
            }
            ],
        onSubmit: function (errors, values) {
            console.log(errors, values, parentNode, currentNode);
            node = values;
            rel = {'parent': parentNode['_id'], 'child': currentNode['_id'], '_type': 'contains', "data":{'pos': values['pos']}}
            
            LASData.insertOne('relationship', rel, false ).then(function(data){
                //console.log(data)
                sumData = currentNode
                sumData['father'] = parentNode;
                sumData['pos'] = values['pos'];
                LASData.addSummary(sumData);
                $('#posContainer').hide();
                //$('#singleContainer [name="features.identifier"]').val('');
            });
            
            return;
        }
      });

      

      

    
});