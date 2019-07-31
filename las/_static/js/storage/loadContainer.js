$(document).ready(function () {
    LASData.init({ 
    'summary': 'divsum',
    'db': viewName
    });

    
    
    form = $('#form').lasForm();
    form.setOptions({
        "schema": {
            "name": {
              "title": "Name",
              "description": "Nickname allowed",
              "type": "string"
            },
            "gender": {
              "title": "Gender",
              "description": "Your gender",
              "type": "string",
              "enum": [
                "male",
                "female",
                "alien"
              ]
            }
          },
          "form": [
            "*",
            {   
                "notitle": true,
                "type": "help",
                "helpvalue": "<strong>Click on <em>Submit</em></strong> when you're done"
            },
            {
              "type": "submit",
              "title": "Submit"
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