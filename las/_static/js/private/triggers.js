$(document).ready(function() {
    currentNs = undefined;

    editor = {'filter': undefined, 'project': undefined, 'updateOp': undefined, 'schema': undefined }
    
    

    
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

    $('#addTriggerEntity').on('click', function(){
        currentNs = 'entity';
        $('#formTrigger').trigger("reset");
        $('#formTrigger select[name="ns"]').val(currentNs);
        $('textarea[name="when"]').val('[]')
        $('textarea[name="pipeline"]').val('[]');
        
        $('#editTrigger').show();
        initPipeline();
        
    });

    $('#addTriggerRel').on('click', function(){
        currentNs = 'relationship';
        $('#formTrigger').trigger("reset");
        $('#formTrigger select[name="ns"]').val(currentNs);
        $('textarea[name="when"]').val('[]')
        $('textarea[name="pipeline"]').val('[]');
        $('#editTrigger').show();
        initPipeline();
        
    });

    $('#tabTriggers').on('click', '.editTrigger', function(){
        var data = $('#tabTriggers').DataTable().row( $(this).parents('tr') ).data();
        console.log(data)
        $('#formTrigger input[name="oid"]').val(data['_id']['$oid'])
        $('#formTrigger select[name="ns"]').val(data['ns']);
        currentNs = data['ns'];
        $('#formTrigger input[name="_class"]').val(data['_class'])
        $('#formTrigger input[name="_class"]').trigger('input.typeahead')
        setTimeout(function () {
            $($('#formTrigger input[name="_class"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')
            $('#formTrigger select[name="e"]').val(data['e'])
            $('#formTrigger textarea[name="when"]').val(JSON.stringify( data['when'] ) )
            // TODO update graph from db
            //$('#formTrigger textarea[name="pipeline"]').val( JSON.stringify(data['pipeline']) )
            
            $('#editTrigger').show();
            initPipeline();
            loadQueryGraph(data['pipeline'])
        }, 500);
        
        
    });

    $('#cancelEdit').on('click', function(){
        $('#editTrigger').hide();
        ggen.clearGraph();
        currentNs = undefined;
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
        dynamic: true,
        emptyTemplate: 'No result for "{{query}}"',
        display: ['_id'],
        source: {
            classes:{
            ajax: {
                url: "/entity/entities/features/",
                path: 'recordsTotal.data',
                data: {
                "startFilter": function(){return JSON.stringify({'ns': currentNs}); },
                "q": "{{query}}",
                "prop": "class",
                "distinct": "class"
                }
            }
            }
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

    
    $('#clearWhen').on('click', function(e){
        e.preventDefault();
        $('textarea[name="when"]').val('[]');
    });

    $('#clearPipeline').on('click', function(e){
        e.preventDefault();
        ggen.clearGraph();
        ggen.addNode(type="start", title="+");
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


    $('#selectBlock').on('click', function(){
        var selected = $('#blockType').val();
        var node = ggen.currentSelectedNode();
        if (selected){
            nodetype = 'block';
            toInsert = true;
            var nodeconfig = { 'endif': 0, 'uuid': uuid()};

            if (node.type != 'start'){
                nodeconfig['endif'] = node.config.endif;
            }
            


            switch(selected){
                case 'end':
                    ggen.connectNodeToEnd(node)
                    toInsert = false
                    break;
                case 'ifelse':
                    nodeclass="ifelse"
                    nodeconfig['endif'] += 1 ;
                    title ="If-else" + '(' + nodeconfig['endif'] + ')'
                    break;
                case 'endif':
                    if (node.config.op == 'ifelse'){
                        toastr['error']("Connot concatenate this block");
                        return;
                    }
                    endifId = 0;
                    titleId = nodeconfig['endif']
                    if ($('#blockType option:selected').data('uuid') != undefined){
                        toInsert = false;
                        endifId = $('#blockType option:selected').data('uuid')
                    }
                    nodeconfig['endif'] -= 1;
                    nodeclass="ifelse"
                    nodetype = 'operator'
                    title=selected + '(' + titleId + ')';
                    if (!toInsert){
                        op = ggen.getAvailableOperators()[endifId];
                        ggen.addArc(node, op);
                    }
                    break;
                default:
                    nodeclass="block"
                    title = selected;
                    break;
            }
            if (toInsert){
                var n1 = ggen.addNode(type=nodetype, title=title, parent=node, nodeclass=nodeclass);
            }
            if(toInsert && n1!=undefined){
                nodeconfig['op'] = selected;
                //nodeconfig['name'] = title ;
                n1.data = {'title': title}
                n1.config = nodeconfig;
                if (selected == 'exception'){
                    ggen.connectNodeToEnd(n1)
                }
            }
            $('#modalBlock').modal('hide');
            
        }
        else{
            toastr['error']("Select one block type");
        }
    })


    $('#saveBlockConfig').on('click', function(){
        var node = ggen.currentSelectedNode();
        var data = node.config
        switch (node.config.op){
            case 'ifelse':
                data['cond'] =  '"""' +  editor['filter'].getValue() + '"""';
                break;
            case 'endif':
                // do nothing
                return;
            case 'query':
                data['var'] =$('#modalConfigBlock input[name="var"]').val(); 
                data['ns'] = $('#modalConfigBlock select[name="ns"]').val();
                data['aggr'] = $('#modalConfigBlock input[name="aggregation"]').prop('checked');
                data['many'] = $('#modalConfigBlock input[name="many"]').prop('checked');
                data['count'] = $('#modalConfigBlock input[name="many"]').prop('checked');
                data['filter'] ='"""' +  editor['filter'].getValue() + '"""';
                data['project'] ='"""' +  editor['project'].getValue() + '"""';
                data['schema'] ='"""' +  editor['schema'].getValue() + '"""';
                break;
            case 'delete':
                data['ns'] = $('#modalConfigBlock select[name="ns"]').val();
                data['many'] = $('#modalConfigBlock input[name="many"]').prop('checked');
                data['filter'] ='"""' +  editor['filter'].getValue() + '"""';
                break;
            case 'update':
                data['ns'] = $('#modalConfigBlock select[name="ns"]').val();
                data['many'] = $('#modalConfigBlock input[name="many"]').prop('checked');
                data['filter'] ='"""' +  editor['filter'].getValue() + '"""';
                data['update'] ='"""' +  editor['updateOp'].getValue() + '"""';
                break;
            case 'insert':
                data['ns'] = $('#modalConfigBlock select[name="ns"]').val();
                data['filter'] ='"""' +  editor['filter'].getValue() + '"""';
                break;
            case 'exception':
                break;
        }
        console.log(data);
        node.config = data;
        $('#modalConfigBlock').modal('hide');
        
    });

    $('#formTrigger').on('submit', function(e){
        pipeline = ggen.getJsonStrGraph();
        $('#formTrigger input[name="pipeline"]').val(JSON.stringify(pipeline))
        return true;
    })
    
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
            dynamic: true,
            emptyTemplate: 'No result for "{{query}}"',
            display: ['path'],
            source: {
                features:{
                    ajax: {
                        url: "/entity/entities/features/",
                        path: 'recordsTotal.data',
                        data: {
                        "startFilter": function(){console.log($('input.js-typeahead-class').val()); return JSON.stringify({'ns': currentNs, 'class':  $('input.js-typeahead-class').val(), 'type': { '$ne': 'object'}}); },
                        "q": "{{query}}",
                        "prop": "path",
                        }
                    }
                }
            },
            callback: {
                onClickAfter: function (node, a, item, event) {
                    event.preventDefault();
                    currentCard = $($(this.selector)[0]).parents('.card').prop('id')
                    console.log(node, a, item, event);
                    $('#'+ currentCard + ' .value').empty();
                    html = defineValue(currentCard, item['type']);
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
            setTimeout(function () {
                $($('#'+ cardId + ' input[name="featSearch"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click');
                if (whenCond['ftype'] == 'boolean'){
                    $('#'+ cardId + ' input[name="value"]').prop('checked', whenCond['v'])
                }
                else{
                    $('#'+ cardId + ' input[name="value"]').val(whenCond['v'])
                }    
            }, 500);
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



function multiSelect(params) {
    return new Promise((resolve, reject) => {
        cardId = params['cardId']
        value = params['value']
        nameField = params['field']
        $('#' +cardId + ' input[name="'+ nameField+ '"]').val(value)
        $('#' +cardId + ' input[name="'+ nameField+ '"]').trigger('input.typeahead')
        setTimeout(() => {
            $($('#' +cardId + ' input[name="'+ nameField+ '"]').parents('.typeahead__container').find('.typeahead__item')[0]).trigger('click')
            console.log('Resolve! ', params);
    
            resolve();
        }, 1000);
    });
}
  

var f_block = function buildBlockModal(node){
    ggen.currentSelectedNode(node);
    
    if(node.config.op !="ifelse" && node.children.length>0){
        toastr["warning"]("You cannot add additonal node")
        return;
    }
    else{
        if (node.config.op =="ifelse" && node.children.length==2){
            toastr["warning"]("If-else block can have only two braches");
            return;
        }
    }

    $('#blockType').empty();

    options = ['<option value="">--- Select one ---</option>', '<option value=query>Query</option>', '<option value="update">Update</option>', '<option value="insert">Insert</option>', '<option value="delete">Delete</option>', '<option value="ifelse">If-Else</option>', '<option value="exception">Exception</option>']
    options.forEach( (op,i) => {
        $('#blockType').append(op);
    });

    availableops = ggen.getAvailableOperators();
    addtionalEndif = true;
    availableops.forEach( (op,i) => {
        if (op.config.endif < node.config.endif ){
            $('#blockType').append('<option value="endif" data-uuid="' + i + '">Endif ('+ i +')</option>')
            addtionalEndif = false
        }
    });

    if (node.type != 'start'){
        if (node.config.endif && node.config.op != 'ifelse' && addtionalEndif){
            $('#blockType').append('<option value="endif">Endif</option>')
        }
        if (node.config.endif == 0){
            $('#blockType').append('<option value="end">End</option>')
        }
    }



    $('#modalBlock').modal();

}

var f_config = function buildBlockModal(node){

    // editor = {'filter': undefined, 'project': undefined, 'updateOp': undefined, 'schema': undefined }
    ggen.currentSelectedNode(node);
    
    if(node.type=="start" || node.type=="end"){
        return;
    }
    switch (node.config.op){
        case 'ifelse':
            // show modal for if constraints
            $.get("/las_static/templates/triggers/blockIfElse.html", function( data ) {
                t = $.parseHTML(data)[0];
                console.log(t)
                var clone = document.importNode(t.content, true);
                $('#configBlock').empty();
                $('#configBlock').append(clone);

                editor['filter'] = ace.edit("filterEditor");
                editor['filter'].setTheme("ace/theme/twilight");
                editor['filter'].session.setMode("ace/mode/json");
                if (node.config.hasOwnProperty('cond')){
                    editor['filter'].session.setValue( node.config.cond.replace (RegExp('"""', 'g' ), '' ) )
                }
                

                $('#modalConfigBlock').modal();
            });
            break;
        case 'endif':
            // do nothing
            return;
        case 'exception':
            return;
        case 'query':
            // show modal for query
            $.get("/las_static/templates/triggers/blockQuery.html", function( data ) {
                t = $.parseHTML(data)[0];
                console.log(t)
                var clone = document.importNode(t.content, true);
                $('#configBlock').empty();
                $('#configBlock').append(clone);


                editor['filter'] = ace.edit("filterEditor");
                editor['filter'].setTheme("ace/theme/twilight");
                editor['filter'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('filter')){
                    editor['filter'].session.setValue( node.config.filter.replace (RegExp('"""', 'g' ), '' ) )
                }


                editor['project'] = ace.edit("projectEditor");
                editor['project'].setTheme("ace/theme/twilight");
                editor['project'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('project')){
                    editor['project'].session.setValue( node.config.project.replace (RegExp('"""', 'g' ), '' ) )
                }
                

                editor['schema'] = ace.edit("schemaEditor");
                editor['schema'].setTheme("ace/theme/twilight");
                editor['schema'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('schema')){
                    editor['schema'].session.setValue( node.config.schema.replace (RegExp('"""', 'g' ), '' ) )
                }

                
                if (node.config.hasOwnProperty('var'))
                    $('#modalConfigBlock input[name="var"]').val(node.config['var']); 
                if (node.config.hasOwnProperty('ns'))
                    $('#modalConfigBlock select[name="ns"]').val(node.config['ns']);
                if (node.config.hasOwnProperty('aggr'))
                    $('#modalConfigBlock input[name="aggregation"]').prop('checked', node.config['aggr']);
                if (node.config.hasOwnProperty('many'))
                    $('#modalConfigBlock input[name="many"]').prop('checked', node.config['many']);
                if (node.config.hasOwnProperty('many'))
                    $('#modalConfigBlock input[name="many"]').prop('checked', node.config['count']);


                $('#modalConfigBlock').modal();
            });
            break;
        case 'delete':
            // show modal for delete
            $.get("/las_static/templates/triggers/blockDelete.html", function( data ) {
                t = $.parseHTML(data)[0];
                console.log(t)
                var clone = document.importNode(t.content, true);
                $('#configBlock').empty();
                $('#configBlock').append(clone);

                editor['filter'] = ace.edit("filterEditor");
                editor['filter'].setTheme("ace/theme/twilight");
                editor['filter'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('filter')){
                    editor['filter'].session.setValue( node.config.filter.replace (RegExp('"""', 'g' ), '' ) )
                }

                if (node.config.hasOwnProperty('ns'))
                    $('#modalConfigBlock select[name="ns"]').val(node.config['ns']);
                if (node.config.hasOwnProperty('many'))
                    $('#modalConfigBlock input[name="many"]').prop('checked',node. data['many']);

                
                
                $('#modalConfigBlock').modal();
            });
            break;
        case 'update':
            // show modal for update
            $.get("/las_static/templates/triggers/blockUpdate.html", function( data ) {
                t = $.parseHTML(data)[0];
                console.log(t)
                var clone = document.importNode(t.content, true);
                $('#configBlock').empty();
                $('#configBlock').append(clone);

                editor['filter'] = ace.edit("filterEditor");
                editor['filter'].setTheme("ace/theme/twilight");
                editor['filter'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('filter')){
                    editor['filter'].session.setValue( node.config.filter.replace (RegExp('"""', 'g' ), '' ) )
                }

                editor['updateOp'] = ace.edit("updateEditor");
                editor['updateOp'].setTheme("ace/theme/twilight");
                editor['updateOp'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('update')){
                    editor['updateOp'].session.setValue( node.config.update.replace (RegExp('"""', 'g' ), '' ) )
                }

                if (node.config.hasOwnProperty('ns'))
                    $('#modalConfigBlock select[name="ns"]').val(node.config['ns']);
                if (node.config.hasOwnProperty('many'))
                    $('#modalConfigBlock input[name="many"]').prop('checked', node.config['many']);

                $('#modalConfigBlock').modal();
            });
            break;
        case 'insert':
            // show modal for insert
            $.get("/las_static/templates/triggers/blockInsert.html", function( data ) {
                t = $.parseHTML(data)[0];
                console.log(t)
                var clone = document.importNode(t.content, true);
                $('#configBlock').empty();
                $('#configBlock').append(clone);

                editor['filter'] = ace.edit("insertEditor");
                editor['filter'].setTheme("ace/theme/twilight");
                editor['filter'].session.setMode("ace/mode/json");

                if (node.config.hasOwnProperty('filter')){
                    editor['filter'].session.setValue( node.config.filter.replace (RegExp('"""', 'g' ), '' ) )
                }

                if (node.config.hasOwnProperty('ns'))
                    $('#modalConfigBlock select[name="ns"]').val(node.config['ns']);

                $('#modalConfigBlock').modal();
            });
            break;
    }
    
}

function loadQueryGraph(queryGraph) {
        
    if(queryGraph["start"]==undefined)
        return;

    //n0 = ggen.addNode(type=="start", title=queryGraph["start"].title);
    n0 = ggen.nodes()[0];

    console.log("Start is ", n0);
    console.log(queryGraph)
    
    queryGraph["start"].w_out.forEach(d=>{
        //for each node in w_out call restoreNodeRecursive
        restoreNodeRecursive(parseInt(d), n0, queryGraph);
    });

}

function restoreNodeRecursive(i, parent, queryGraph){
    
    if(i!="end") i = parseInt(i);
    //console.log("-------> restore node ", i);
    if(i=="end"){
        
        //if w_out is end
        //connect to end and add to it translator
        var nend = ggen.connectNodeToEnd(parent);
        //nend.config.translators = queryGraph[i].translators;

    } else {
        console.log('Received', queryGraph[i], parent)
        nodetype = 'block';
        toInsert = true;
        switch(queryGraph[i].op){
            case 'ifelse':
                nodeclass="ifelse"
                //nodeconfig['endif'] += 1 ;
                title ="If-else" + '(' + queryGraph[i]['endif'] + ')'
                break;
            case 'endif':
                
                endifId = queryGraph[i]['endif'];
                titleId = queryGraph[i]['endif']
                
                nodeclass="ifelse"
                nodetype = 'operator'
                title=queryGraph[i].op + '(' + titleId + ')';

                op = ggen.getAvailableOperators()[endifId];
                console.log(op)

                if (op){
                    ggen.addArc(parent, op);
                    toInsert = false;
                }
                
                break;
            default:
                nodeclass="block"
                title = queryGraph[i].op;
                break;
        }

        if (toInsert){
            var node = ggen.addNode(type=nodetype, title=title, parent=parent, nodeclass=nodeclass);
            console.log('added', queryGraph[i], parent)
            node.config = queryGraph[i];
            if (queryGraph[i].w_out != undefined){
                for (var k=0; k< queryGraph[i].w_out.length; k++){
                    console.log('send', queryGraph[i].w_out[k], node)
                    restoreNodeRecursive(queryGraph[i].w_out[k], node, queryGraph);
                }
            }
        }
        
    }
    

}

function initPipeline(){
    $('#pipeline').empty();
    ggen.initCanvas('#pipeline');
    
    n0 = ggen.addNode(type="start", title="+");
    ggen.setCustomFunction(f_block, 'start');
    //add function to other blocks to open modal to add block
    ggen.setCustomFunction(f_block, 'block',3);

    //add function to other blocks for configuration
    ggen.setCustomFunction(f_config, 'block',1);

    ggen.setCustomFunction(function(){return;}, 'end',1);

}

