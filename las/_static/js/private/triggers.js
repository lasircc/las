$(document).ready(function() {
    $('#tabTriggers').DataTable({
        'ajax': {
            'url': '/private/triggers/'
        },
        'columns': [
            {'data': '_id.$oid', "visible": false, "searchable": false},
            {'title': 'Namespace', 'data': 'ns'},
            {'title': 'Class', 'data': '_class'},
            {'title': 'Event', 'data': 'e'},
            {'title': 'Actions', "render": function ( data, type, row ) {
                console.log(data, type, row )
                return "<button class='btn btn-primary editTrigger'><span class='fa fa-pencil-alt'></span></button><button class='btn btn-danger deleteTrigger'><span class='fa fa-trash'></span></button>";
                }
            }
        ]
    });

    $('#addTrigger').on('click', function(){
        $('#editTrigger').show();
        $('textarea[name="when"]').val('[]')
        $('textarea[name="pipeline"]').val('[]')
    });

    $('#tabTriggers').on('click', '.editTrigger', function(){
        var data = $('#tabTriggers').DataTable().row( $(this).parents('tr') ).data();
        console.log(data)
        $('#formTrigger input[name="oid"]').val(data['_id']['$oid'])
        $('#formTrigger select[name="ns"]').val(data['ns'])
        $('#formTrigger input[name="_class"]').val(data['_class'])
        $('#formTrigger input[name="_class"]').trigger('input.typeahead')
        $($('#formTrigger input[name="_class"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')
        $('#formTrigger select[name="e"]').val(data['e'])        
        $('#formTrigger textarea[name="when"]').val(JSON.stringify( data['when'] ) )
        $('#formTrigger textarea[name="pipeline"]').val( JSON.stringify(data['pipeline']) )
        

        $('#editTrigger').show();
    });

    $('#cancelEdit').on('click', function(){
        $('#editTrigger').hide();
        
        $('#formTrigger').trigger("reset");
    })

    $('#tabTriggers').on('click', '.deleteTrigger', function(){
        var data = $('#tabTriggers').DataTable().row( $(this).parents('tr') ).data();
        $.ajax({
            url: "/private/triggers/",
            method: 'DELETE',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({
                'oid': data['_id']['$oid']
            })
        }).done(function(response) { 
            console.log(response)
            toastr["success"](response['message']);
            $('#tabTriggers').DataTable().ajax.reload();
        }).fail(function(){
            toastr["error"]("Something went wrong");
        });

        
    });


    $.typeahead({
        input: '.js-typeahead-class',
        minLength: 0,
        maxItem: 15,
        order: "asc",
        hint: true,
        accent: true,
        searchOnFocus: true,
        mustSelectItem:true,
        emptyTemplate: 'No result for "{{query}}"',
        display: ['name'],
        source: {
            data:
            [{"name": "Container"}]
            /*
            {
                ajax: {
                url: "/entity/entities/classes/",
                path: 'recordsTotal.data',
                data: {
                  "q": "{{query}}"
                }
              }
            }
            */
        },
        callback: {
            onClickAfter: function (node, a, item, event) {
                console.log(node, a, item, event);
                
            },
            onCancel: function(node, item, event){
                console.log(node);
            }
        }
    });

    $('#editWhen').on('click', function(e){
        e.preventDefault();
        $('#whenList').empty();
        whenList = JSON.parse ($('textarea[name="when"]').val());
        for (var i=0; i<whenList.length; i++){
            formWhen(whenList[i]);
        }
        $('#modalWhen').modal();
    })

    $('#editPipeline').on('click', function(e){
        e.preventDefault();
        $('#pipelineList').empty();
        pipelineList = JSON.parse ($('textarea[name="pipeline"]').val());
        for (var i=0; i<pipelineList.length; i++){
            formPipeline(pipelineList[i]['f'], pipelineList[i]['params']);
        }
        $('#modalPipeline').modal();
    })

    $('#clearWhen').on('click', function(e){
        e.preventDefault();
        $('textarea[name="when"]').val('[]');
    });

    $('#clearPipeline').on('click', function(e){
        e.preventDefault();
        $('textarea[name="pipeline"]').val('[]');
    });


    $('#addWhenCond').on('click', function(){
        formWhen(null);
    })

    $('#saveWhen').on('click', function(){
        cards = $('#whenList .card');
        
        whenList = []
        for (var i=0; i<cards.length; i++){
            feature = $(cards[i].querySelectorAll('input[name="featSearch"]')).val()
            type = $(cards[i].querySelectorAll('input[name="value"]')).prop('type');
            switch(type){
                case 'number':
                    value = parseFloat($(cards[i].querySelectorAll('input[name="value"]')).val())
                    ftype= 'number'
                    break;
                case 'text':
                    value = $(cards[i].querySelectorAll('input[name="value"]')).val();
                    ftype= 'string'
                    break;
                case 'checkbox':
                    value = $(cards[i].querySelectorAll('input[name="value"]')).prop('checked');
                    ftype= 'boolean'
                    break;
            }

            whenList.push({'f': feature, 'v': value, 'ftype': ftype })
        }
        
        $('textarea[name="when"]').val(JSON.stringify(whenList));
        
        $('#modalWhen').modal('hide');
    });


    $('#savePipeline').on('click', function(){
        cards = $('#pipelineList .card');
        
        pipelineList = []

        for (var i=0; i<cards.length; i++){
            type = $(cards[i].querySelectorAll('input[name="typeFunc"]')).val()
            elems = cards[i].querySelectorAll('.track:not(div):not(.typeahead__hint)')
            params = {};
            for (var j=0; j<elems.length; j++){
                val = $(elems[j]).val();
                name = elems[j].getAttribute('name');
                jsonType = elems[j].getAttribute('json')
                
                if (jsonType){
                    params[name] = JSON.parse(val);
                }
                else{
                    params[name] = val;
                }
                
                
            }

            pipelineList.push({'f': type, 'params': params})
        }

      
        $('textarea[name="pipeline"]').val(JSON.stringify(pipelineList));
        
        $('#modalPipeline').modal('hide');
        

    });

    $('#addPipelineStep').on('click', function(){
        stepType = $('#pipelineFunc').val();
        formPipeline(stepType, null);
    });
    
});



function formWhen(whenCond){
    $.get("/las_static/templates/when.html", function( data ) {
        
        t = $.parseHTML(data)[0];
        console.log(t)
        cardId = 'c' + uuid();
        t.content.querySelector('.card').id = cardId;
        var clone = document.importNode(t.content, true);
        
        $('#whenList').append(clone);

        
        $('#'+ cardId + ' .close').on('click', function(){
            idCard = $(this).parents('.card').prop('id')
            $('#'+ idCard).remove();
        });
        $.typeahead({
            input: '#'+ cardId + ' .js-typeahead',
            minLength: 0,
            maxItem: 15,
            order: "asc",
            hint: true,
            accent: true,
            searchOnFocus: true,
            mustSelectItem:true,
            emptyTemplate: 'No result for "{{query}}"',
            display: ['name'],
            source: {
                data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" } ]
                /*
                    {
                    ajax: {
                    url: "/entity/entities/features/",
                    path: 'recordsTotal.data',
                    data: {
                      "q": "{{query}}"
                    }
                  }
                  }
                    */
            },
            callback: {
                onClickAfter: function (node, a, item, event) {
                    event.preventDefault();
                    currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                    console.log(node, a, item, event);
                    $('#'+ currentCard + ' .value').empty();
                    html = defineValue(currentCard, item['_type']);
                    $('#'+ currentCard + ' .value').append(html);
                    
                },
                onCancel: function(node, item, event){
                    currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                    $('#'+ currentCard + ' .value').empty();
                }
            }
        });
        
        if (whenCond){
            $('#'+ cardId + ' input[name="featSearch"]').val(whenCond['f'])
            $('#'+ cardId + ' input[name="featSearch"]').trigger('input.typeahead')
            $($('#'+ cardId + ' input[name="featSearch"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click');
            
            if (whenCond['ftype'] == 'boolean'){
                $('#'+ cardId + ' input[name="value"]').prop('checked', whenCond['v'])
            }
            else{
                $('#'+ cardId + ' input[name="value"]').val(whenCond['v'])
            }
        }
    });

}


function defineValue(id, nodeType){
    html = ''
    switch(nodeType){
        case 'string':
            html ='<label>Value</label>'+
                '<input type="text" required name="value" class="form-control">'
            break;
        case 'boolean':
            html = '<div class="custom-control custom-switch">' +
                '<input type="checkbox" class="custom-control-input" id="b' + id + '" name="value">' +
                '<label class="custom-control-label" for="b' + id + '">Value</label>' +
                '</div>'
            break;
        case 'number':
            html ='<label>Value</label>'+
                '<input type="number" required name="value" class="form-control">'            
            break;

    }
    return html;
}


function formPipeline(stepType, params){
    switch(stepType){
        case 'unique':
            $.get("/las_static/templates/unique.html", function( data ) {
        
                t = $.parseHTML(data)[0];
                console.log(t)
                cardId = 'c' + uuid();
                t.content.querySelector('.card').id = cardId;
                var clone = document.importNode(t.content, true);
                
                $('#pipelineList').append(clone);

                $('#'+ cardId + ' .close').on('click', function(){
                    idCard = $(this).parents('.card').prop('id')
                    $('#'+ idCard).remove();
                });

                $.typeahead({
                    input: '#'+ cardId + ' .js-typeahead',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    searchOnFocus: false,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    multiselect: {
                        matchOn: ["name"],
                        cancelOnBackspace: true,
                    },
                    source: {
                        data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" }]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }
                          }
                          }
                            */
                    },
                    callback: {
                        onClickAfter: function (node, a, item, event) {
                            event.preventDefault();
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            console.log(node, a, item, event);
                            currentVals = JSON.parse ( $('#' +currentCard + ' input[name="fields"]').val() );
                            currentVals.push(item['name']);
                            $('#' +currentCard + ' input[name="fields"]').val(JSON.stringify(currentVals) )
                        },
                        onCancel: function(node, item, event){
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            $('#'+ currentCard + ' .value').empty();
                            currentVals = $('#' +currentCard + ' input[name="fields"]').val()
                            currentVals = _.without(currentVals, item['name'] ); 
                            $('#' +currentCard + ' input[name="fields"]').val(JSON.stringify(currentVals) )

                        }
                    }
                });

                if (params){
                    for (var i=0; i<params['fields'].length; i++){
                        $('#' +cardId + ' input[name="featSearch"]').val(params['fields'][i])
                        $('#' +cardId + ' input[name="featSearch"]').trigger('input.typeahead')
                        $($('#'+cardId + ' input[name="featSearch"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')
                    }
                }
            });
            break;
        case 'schema':
            $.get("/las_static/templates/schema.html", function( data ) {
    
                t = $.parseHTML(data)[0];
                console.log(t)
                cardId = 'c' + uuid();
                t.content.querySelector('.card').id = cardId;
                var clone = document.importNode(t.content, true);
                
                $('#pipelineList').append(clone);

                $('#'+ cardId + ' .close').on('click', function(){
                    idCard = $(this).parents('.card').prop('id')
                    $('#'+ idCard).remove();
                });
            });

            break;
        case 'update':
            $.get("/las_static/templates/update.html", function( data ) {
    
                t = $.parseHTML(data)[0];
                console.log(t)
                cardId = 'c' + uuid();
                t.content.querySelector('.card').id = cardId;
                var clone = document.importNode(t.content, true);
                
                $('#pipelineList').append(clone);

                $('#'+ cardId + ' .close').on('click', function(){
                    idCard = $(this).parents('.card').prop('id')
                    $('#'+ idCard).remove();
                });
                $.typeahead({
                    input: '#'+ cardId + ' .js-typeahead',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    searchOnFocus: true,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    source: {
                        data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" } ]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }
                          }
                          }
                            */
                    },
                    callback: {
                        onClickAfter: function (node, a, item, event) {
                            event.preventDefault();
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            console.log(node, a, item, event);
                            $('#'+ currentCard + ' .value').empty();
                            html = defineValue(currentCard, item['_type']);
                            $('#'+ currentCard + ' .value').append(html);
                            
                        },
                        onCancel: function(node, item, event){
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            $('#'+ currentCard + ' .value').empty();
                        }
                    }
                });

                $('#' + cardId + ' .dict-add').on('click', function(){
                    idCard = $(this).parents('.card').prop('id');
                    feature = $('#'+ idCard + ' input[name="featSearch"]').val();
                    type = $('#'+ idCard + ' input[name="value"]').prop('type');
                    switch(type){
                        case 'number':
                            value = parseFloat($('#'+ idCard + ' input[name="value"]').val())
                            ftype= 'number'
                            break;
                        case 'text':
                            value = $('#'+ idCard + ' input[name="value"]').val();
                            ftype= 'string'
                            break;
                        case 'checkbox':
                            value = $('#'+ idCard + ' input[name="value"]').prop('checked');
                            ftype= 'boolean'
                            break;
                    }
                    if (feature != undefined && value != undefined){
                        data = $('#' + idCard + ' input[name="dict"]').val();
                        if (data){
                            data = JSON.parse(data)
                        }
                        else{
                            data = {}
                        }
                        data[feature] = value;
                        $('#' + idCard + ' input[name="dict"]').val(JSON.stringify(data));
                        $('#' + idCard + ' .list-group').empty();
                        for (k in data){
                            $('#' + idCard + ' .list-group').append('<li class="list-group-item">' + k + ' ---> ' + data[k] + ' <button class="btn btn-danger" data-key="'+ k +'"><span class="fa fa-minus"></span></li>')
                        }
                    }
                })


                $('#' + cardId+ ' .list-group').on('click', '.btn-danger', function(){
                    idCard = $(this).parents('.card').prop('id');
                    key = $(this).data('key');
                    data = $('#' + idCard + ' input[name="dict"]').val();
                    if (data){
                        data = JSON.parse(data)
                    }
                    else{
                        data = {}
                    }
                    delete data[key]
                    $('#' + idCard + ' input[name="dict"]').val(JSON.stringify(data));
                    $('#' + idCard + ' .list-group').empty();
                    for (k in data){
                        $('#' + idCard + ' .list-group').append('<li class="list-group-item">' + k + ' ---> ' + data[k] + ' <button class="btn btn-danger" data-key="'+ k +'"><span class="fa fa-minus"></span></li>')
                    }

                
                });

                if (params){
                    $('#' + cardId + ' input[name="dict"]').val(JSON.stringify(params['dict']));
                    $('#' + cardId + ' .list-group').empty();
                    for (k in params['dict']){
                        $('#' + cardId + ' .list-group').append('<li class="list-group-item">' + k + ' ---> ' + params['dict'][k] + ' <button class="btn btn-danger" data-key="'+ k +'"><span class="fa fa-minus"></span></li>')
                    }
                }
            });

            
            break;
        case 'inherit':
            $.get("/las_static/templates/inherit.html", function( data ) {

                t = $.parseHTML(data)[0];
                console.log(t)
                cardId = 'c' + uuid();
                t.content.querySelector('.card').id = cardId;
                var clone = document.importNode(t.content, true);
                
                $('#pipelineList').append(clone);

                $('#'+ cardId + ' .close').on('click', function(){
                    idCard = $(this).parents('.card').prop('id')
                    $('#'+ idCard).remove();
                });

                $.typeahead({
                    input: '#'+ cardId + ' input[name="inputField"]',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    searchOnFocus: true,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    source: {
                        data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" } ]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }
                          }
                          }
                            */
                    }
                });

                $.typeahead({
                    input: '#'+ cardId + ' input[name="joinField"]',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    source: {
                        data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" } ]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }searchOnFocus: true,
                          }searchOnFocus: true,
                          }searchOnFocus: true,
                            */
                    }
                });

                $.typeahead({
                    input: '#'+ cardId + ' input[name="typeDoc"]',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    source: {
                        data: [ {"name":"Container"} ]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }
                          }
                          }
                            */
                    }
                });

                $.typeahead({
                    input: '#'+ cardId + ' input[name="featCopySearch"]',
                    minLength: 0,
                    maxItem: 15,
                    order: "asc",
                    hint: true,
                    accent: true,
                    mustSelectItem:true,
                    emptyTemplate: 'No result for "{{query}}"',
                    display: ['name'],
                    multiselect: {
                        matchOn: ["name"],
                        cancelOnBackspace: true,
                    },
                    source: {
                        data: [ {"name":"features.barcode", "_type": "string"},{"name":"features.contType", "_type": "string"}, {"name":"features.available", "_type": "boolean" }, {"name":"features.dim.x", "_type": "number" }, {"name":"features.dim.y", "_type": "number" } ]
                        /*
                            {
                            ajax: {
                            url: "/entity/entities/features/",
                            path: 'recordsTotal.data',
                            data: {
                              "q": "{{query}}"
                            }
                          }
                          }
                            */
                    },
                    callback: {
                        onClickAfter: function (node, a, item, event) {
                            event.preventDefault();
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            console.log(node, a, item, event);
                            currentVals = JSON.parse ( $('#' +currentCard + ' input[name="fToCopy"]').val() );
                            currentVals.push(item['name']);
                            $('#' +currentCard + ' input[name="fToCopy"]').val(JSON.stringify(currentVals) )
                        },
                        onCancel: function(node, item, event){
                            currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                            $('#'+ currentCard + ' .value').empty();
                            currentVals = $('#' +currentCard + ' input[name="fToCopy"]').val()
                            currentVals = _.without(currentVals, item['name'] ); 
                            $('#' +currentCard + ' input[name="fToCopy"]').val(JSON.stringify(currentVals) )

                        }
                    }
                });

                if (params){
                    $('#' +cardId + ' input[name="inputField"]').val(params['inputField'])
                    $('#' +cardId + ' input[name="inputField"]').trigger('input.typeahead')
                    $($('#'+cardId + ' input[name="inputField"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')

                    $('#'+cardId + ' select[name="ns"]').val(params['ns'])

                    $('#' +cardId + ' input[name="typeDoc"]').val(params['typeDoc'])
                    $('#' +cardId + ' input[name="typeDoc"]').trigger('input.typeahead')
                    $($('#'+cardId + ' input[name="typeDoc"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')

                    $('#' +cardId + ' input[name="joinField"]').val(params['joinField'])
                    $('#' +cardId + ' input[name="joinField"]').trigger('input.typeahead')
                    $($('#'+cardId + ' input[name="joinField"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')



                    
                    
                    
                    for (var i=0; i<params['fToCopy'].length; i++){
                        $('#' +cardId + ' input[name="featCopySearch"]').val(params['fToCopy'][i])
                        $('#' +cardId + ' input[name="featCopySearch"]').trigger('input.typeahead')
                        $($('#'+cardId + ' input[name="featCopySearch"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')
                    }
                }
            });
            break;
    }

}