$(document).ready(function () {

    currentNode = undefined;
    parentNode = undefined;

    pageData = LASData.init({ 
    'summary': {
        'div': 'divsum',
        'header': [{"title": "Barcode", "data": "features.barcode"}, {"title": "Gender", "data": "features.gender"}, {"title": "Strain", "data": "features.strain"},{"title": "Birth Date", "data": "features.bith_date"}, {"title": "Arrival Date", "data": "features.arrival_date"}, {"title": "Source", "data": "features.source"}  ],
    },
    'db': viewName
    });

    
    
    form = $('#registerMouse').lasForm();

    form.setOptions({
        "schema": {
            "features": {
              "type": "object",
              "title": "Info",
              "properties":{
                "barcode": {
                    "title": "Barcode",
                    "type": "string",
                    "required": true,
                },
                "source": {
                    "title": "Source",
                    "type": "string",
                    "required": true,
                },
                "strain": {
                    "title": "Strain",
                    "type": "string",
                    "required": true
                },
                "gender": {
                    "title": "Gender",
                    "type": "string",
                    "required": true,
                    "enum": [ "Male", "Female"]
                },
                "arrival_date": {
                    "title": "Arrival Date",
                    "type": "date",
                    "required": true,
                },
                "bith_date": {
                    "title": "Birth Date",
                    "type": "date",
                    "required": true,
                }
              }
            }
          },
          "form": [
            '*',
            {
                "key": "features.gender",
                "type": "radios"
            },
            {
                "key": "features.strain",
                "type": "typeahead",
                "event": {
                    source: {data:[ {"name":"NOD", "_id": "NOD"}, {"name":"MouseIRCC", "_id": "MouseIRCC"} ]},
                    display: ['name'],
                    minLength: 1,
                }
            },
            {
                "key": "features.source",
                "type": "typeahead",
                "event": {
                    source: {data:[ {"name":"Charles River", "_id": "Charles"}]},
                    display: ['name'],
                    minLength: 1,
                }
            }
            ],
        onSubmit: function (errors, values) {
            console.log(errors, values)
            node = values;
            node['_type'] = ['Mouse'];
            LASData.insertOne('entity', node, false ).then(function(data){
                console.log(data)
                sumData = data
                LASData.addSummary(sumData);
                $('#registerMouse [name="features.barcode"]').val('');
            });
            return;
        }
      });


    
});