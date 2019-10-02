$(document).ready(function () {

    currentNode = undefined;
    parentNode = undefined;

    pageData = LASData.init({ 
    'summary': {
        'div': 'divsum',
        'header': [{"title": "Barcode", "data": "features.barcode"}, {"title": "Type", "data": "_type"}, {"title": "Geometry", "data": "features.dim", "render": function ( data, type, row, meta ) {
            return data.x + 'X' + data.y;
          }}, {"title": "Father", "data": "father"}, {"title": "Position", "data": "pos"}],
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
            "features": {
              "type": "object",
              "title": "Info",
              "properties":{
                "contType":{
                  "title": "Container type",
                  "type": "string",
                  "required": true
                },
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
                "key": "features.contType",
                "type": "typeahead",
                "event": {
                    source: {data:[ {"name":"Thermo", "_id": "Thermo", "dim": {"x": 4, "y": 6}}, {"name":"Tube", "_id": "tube", "dim": {"x": 1, "y": 1} } ]},
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
            node['_type'] = ['Container']
            delete node['position'];
            LASData.insert('entity', [node] ).then(function(data){
                console.log(data, positioning)
                $('#singleContainer [name="features.barcode"]').val('');
                if (positioning == true ){
                  $('#posContainer').show();
                  LASData.findOne('entity', data[0]['$oid']).then(function(nodeToPos){
                    currentNode = nodeToPos;
                    $('#posContainer [name="child"]').val(currentNode['features']['barcode']);
                  })
                  
                }
                else{
                  _.each(data, function(item) {
                    console.log('sumData iter', item['$oid'])
                    LASData.findOne('entity', item['$oid']).then (function(sumData){
                      console.log(sumData)
                      sumData['father'] = '';
                      sumData['pos'] = '';
                      LASData.addSummary(sumData);
                    });
                  });
                }
                
            });
            return;
        }
      });


    form = $('#posContainer').lasForm();

    form.setOptions({
        "schema": {
            "child": {
              "title": "Child",
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
                            LASData.insert('entity', [item] ).then(function(data){
                              console.log(data)
                              LASData.findOne('entity', data[0]['$oid']).then(function(node){
                                parentNode = node;
                              })
                              
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
            rel = {'parent': parentNode["_id"], 'child': currentNode['_id'], '_type': ['contains'], "features":{'pos': values['pos']}}
            
            LASData.insert('relationship', [rel] ).then(function(data){
                //console.log(data)
                sumData = currentNode
                sumData['father'] = parentNode['features']['barcode'];
                sumData['pos'] = values['pos'];
                LASData.addSummary(sumData);
                $('#posContainer').hide();
                //$('#singleContainer [name="features.identifier"]').val('');
            });
            
            return;
        }
      });

      

      

    
});