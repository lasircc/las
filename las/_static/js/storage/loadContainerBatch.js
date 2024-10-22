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

    uploader = $('#containerBatch').templateUploader();
    uploader.setOptions({'templates':[ {"name":"Template1 pippo", "_id": "Template1"}, {"name":"Template2 pluto", "_id": "Template2"}]})
    
});