$(document).ready(function () {
    LASData.init({ 
    'summary': 'divsum',
    'db': viewName
    });

    
    
    form = $('#form').lasForm();
    form.setOptions({
        "schema": {
            "apikey": {
              "type": "string",
              "title": "API key",
              "default": "supercalifragilisticexpialidocious"
            },
            "text": {
              "type": "string",
              "title": "Search string"
            }
          },
          "form": [
            
            "text"
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