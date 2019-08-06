(function($) {

    $.fn.templateUploader = function(options) {
        var defaults = {submitEvent: 'submit'};

        var settings = $.extend({}, defaults, options);
        
        if (this.length > 1) {
            this.each(function() { $(this).templateUploader(options) });
            return this;
        }
        var formElt = this;

        this.initialize = function() {
            /*
            var form = new formTree();
            console.log(settings);

            if (settings.hasOwnProperty('schema')){

                form.initialize(settings);
                this.empty();
                form.render(formElt.get(0));
        
                formElt.data("lasform-tree", form);
        
                if (settings.submitEvent) {
                    formElt.unbind((settings.submitEvent)+'.lasform');
                    formElt.bind((settings.submitEvent)+'.lasform', function(evt) {
                        form.submit(evt);
                    });
                }
            }
            */
    
            return;
        }

        this.setOptions = function(options) {
            settings = $.extend({}, defaults, options);
            console.log(settings);
            this.initialize();
        }

        this.updateSchema = function(schema) {
            /*
            settings['schema'] = schema;
            settings['form'] = ['*'];
            console.log(settings)
            this.initialize();
            */
        }

        

        this.onSubmit = function(f){
            settings.onSubmit = f;
            //this.initialize();
        }

      
        
        this.initialize();
        
        return this;
    }

})(jQuery);