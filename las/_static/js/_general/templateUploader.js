(function($) {


    /*
    options: 
    {
        'templates': [],
        'onSubmit': function(){}
    }
    
    */
    $.fn.templateUploader = function(options) {
        var defaults = {onSubmit: function(){console.log('submit')}, 'templates': []};

        var currentTemplate = null;

        var settings = $.extend({}, defaults, options);
        
        if (this.length > 1) {
            this.each(function() { $(this).templateUploader(options) });
            return this;
        }
        var formElt = this;

        this.initialize = function() {
            $.get("/las_static/templates/templateUploader.html", function( data ) {
                t = $.parseHTML(data)[0]
                console.log(formElt)
                uuidAccordion ='a' + uuid();
                uuidResults = 'r' + uuid();
                uuidHeader = 'h' + uuid();


                t.content.querySelector('.accordionRes').id = uuidAccordion;
                t.content.querySelector('.card-header').id = uuidHeader;
                t.content.querySelector('.btn-link').setAttribute('data-target', '#' + uuidResults);
                t.content.querySelector('.btn-link').setAttribute('aria-controls', uuidResults);
                t.content.querySelector('.collapse').id = uuidResults;
                t.content.querySelector('.collapse').setAttribute('data-parent', '#' + uuidAccordion);
                t.content.querySelector('.collapse').setAttribute('aria-labelledby', uuidHeader);
                

                var clone = document.importNode(t.content, true);
                formElt.empty();
                formElt.append(clone);

                if (settings.templates.length > 1){
                    $.typeahead({
                        input: '.js-typeahead-templateUp',
                        source: {data:[ {"name":"Template1", "_id": "Template1"}, {"name":"Template2", "_id": "Template2"} ]},
                        display: ['name'],
                        minLength: 1,
                        callback:  {
                            onClickAfter: function (node, a, item, event) {
                                currentTemplate = item;
                                console.log('currentTemplate ->', currentTemplate);
                            },
                            onCancel: function (node, a, item, event) {
                                currentTemplate = null;
                                console.log('currentTemplate ->', currentTemplate);
                            }
                        }
                    });
                    $('.typeahead__container').show();
                }
                else{
                    $('.typeahead__container').hide();
                    if (settings.templates.length == 1){
                        currentTemplate = settings.templates[0];
                    }
                }
                console.log('currentTemplate ->', currentTemplate);



            });
            
    
            return;
        }

        this.setOptions = function(options) {
            settings = $.extend({}, defaults, options);
            console.log(settings);
            this.initialize();
        }

                

        this.onSubmit = function(f){
            settings.onSubmit = f;
            this.initialize();
        }

      
        
        this.initialize();
        
        return this;
    }

})(jQuery);