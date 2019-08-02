
const LASContainer = (function() {

    let lasData 
    let lasDb = null;
    let currentEntity = null;

    // information about aliquot features (needed to update feature of aliquot)
    let aliquotFeatures = {};


    // function to init all the container divs, summary table, card current entity

    /* init the library. Should be called on document ready of the page in which the library should be included
        -- example info with possibile values ---
        info = {'containers': [
                        {'id': 'div1', 
                        'type': 'inc/dec/pos', 
                        'generate': true/false, 
                        'aliqType'; [{'label':'Viable', 'code': 'VT'}, ...]}
                    ], 
                'summary': 'divsum',
                'summaryList': []
                'card': 'divcard',
                'db': 'namedb'
            }
    */
    function initPage(info){

        lasData = info;
        const object = new Object(lasData);

        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }
    
        var DBOpenRequest = window.indexedDB.open(lasData['db'],1)
    
        DBOpenRequest.onsuccess = function(){
            lasDb = DBOpenRequest.result;
            //console.log(lasDb.objectStoreNames.contains('entity'));
            getAliquotFeatures().then(function(){
                for (var i=0; i<lasData['containers'].length; i++){
                    //generate empty container div
                    initContainer(lasData['containers'][i])
                }
                initSummary();
                initCardEntity();
            });
        }
    
        DBOpenRequest.onupgradeneeded = function(event){
            var db = event.target.result;
            //console.log('making a new object store');
            if (!db.objectStoreNames.contains('entity')) {
                objStore = db.createObjectStore('entity', {keyPath: 'oid', autoIncrement:true});
                objStore.createIndex("identifier", "identifier", { unique: true });
            }
            if (!db.objectStoreNames.contains('todo')) {
                objStore = db.createObjectStore('todo', {keyPath: 'oid'});
                objStore.createIndex("status", "status", { unique: false });
            }
            if (!db.objectStoreNames.contains('log')) {
                db.createObjectStore('log', {keyPath: 'id', autoIncrement: true});
            }
            if (!db.objectStoreNames.contains('relatioships')) {
                objStore = db.createObjectStore('relatioships', {keyPath: 'id', autoIncrement: true});
                objStore.createIndex("parent", 'parent', { unique: false });
                objStore.createIndex("child", 'child', { unique: false });
                objStore.createIndex("rel", ['parent', 'child'] ,{ unique: true });
            }
        }

        return object;
    
        
    }
    
    // init the div dedicated to the summary (log)
    function initSummary(){
        $.get("/static/templates/summary.html", function( data ) {
            t = $.parseHTML(data)[0]
            var clone = document.importNode(t.content, true);
            $('#'+ lasData['summary']).append(clone);
            if ('summarylist' in lasData)
                columnsDef = lasData['summarylist'];
            else
                columnsDef = [];
            columnsDef.splice(0,0, {"title": "id"})
            columnsDef.splice(1,0, {"title": "Entity"})
    
            var objectStore = lasDb.transaction(['log'], "readonly").objectStore('log');
            var objectStoreRequest =objectStore.getAll();
            objectStoreRequest.onsuccess = function(){
                $('#'+ lasData['summary']+ ' table').DataTable({
                    "data": objectStoreRequest.result,
                    "paging":   true,
                    "ordering": true,
                    "info":     true,
                    "columns": columnsDef
                });
            }
        });
    }
    
    // init the div dedicated to the card element
    function initCardEntity(){
        $.get("/static/templates/card.html", function( data ) {
            t = $.parseHTML(data)[0]
            var clone = document.importNode(t.content, true);
            $('#'+ lasData['card']).append(clone);
            $('#'+ lasData['card']).hide();
            refreshCardList();
            $('#collapseTodo').on('click', '.oi-check', function (event){
                updateTodoStatus($(this).data('oid'), 'current');
            })
            $('#cardlasCurrent').on('click', '.btn-success', function (event){
                //console.log('nextTodo click')
                nextTodo();
            });
            $('#collapseTodo').on('click', '.oi-trash', function (event){
                $(this).data();
                //toastr['warning']("TO implement. Eliminate entity");
                deleteTodo($(this).data('oid'));
            })
        });
    
    
    }
    
    // init the div dedicated to a container with the corresponding functionalities
    function initContainer(divInfo){
        $.get("/static/templates/container.html", function( data ) {
            t = $.parseHTML(data)[0];
            htmlCont = renderContainer(null, 'render');
            if (divInfo['aliqType'].length == 1){
                htmlTitle = '<h5>' + divInfo['aliqType'][0]['label'] + '</h5>' + "<input name='aliqType' type='hidden' value='"+ divInfo['aliqType'][0]['code'] + "'>"
                t.content.querySelector('.card-header').innerHTML = htmlTitle;
                infoEntity = aliquotFeatures[divInfo['aliqType'][0]['code']]
                formEntity = ''
                for (var i=0; i<infoEntity.length; i++){
                    label = infoEntity[i]['name'].split(/(?=[A-Z])/).join(" ").toLowerCase()
                    label = label.substr(0,1).toUpperCase() + label.substr(1)

                    formEntity += '<div class="form-group"><label>'+ label + '</label><input type="number" name="'+ infoEntity[i]['name'] + '" class="form-control" value=1></div>'
                }
                t.content.querySelector('.entityInfo').innerHTML = formEntity

            }
            else{
                htmlSelect = '<div class="form-group"><select name="aliqType" class="form-control">'
                for (var i=0; i<divInfo['aliqType'].length; i++){
                    if (i==0){
                        htmlSelect +="<option value='" + divInfo['aliqType'][i]['code'] + "' selected>" +  divInfo['aliqType'][i]['label'] + "</option>"
                    }
                    else{
                        htmlSelect +="<option value='" + divInfo['aliqType'][i]['code'] + "'>" +  divInfo['aliqType'][i]['label'] + "</option>"    
                    }
                }
                htmlSelect +="</select></div>"
                t.content.querySelector('.card-header').innerHTML = htmlSelect;
                infoEntity = aliquotFeatures[divInfo['aliqType'][0]['code']]
                formEntity = ''
                for (var i=0; i<infoEntity.length; i++){
                    label = infoEntity[i]['name'].split(/(?=[A-Z])/).join(" ").toLowerCase()
                    label = label.substr(0,1).toUpperCase() + label.substr(1)
                    formEntity += '<div class="form-group"><label>'+ label + '</label><input type="number" name="'+ infoEntity[i]['name'] + '" class="form-control" value=1></div>'
                }
                t.content.querySelector('.entityInfo').innerHTML = formEntity
            }
            t.content.querySelector('.lascontainer').innerHTML= htmlCont;
            var clone = document.importNode(t.content, true);
            $('#'+ divInfo['id']).append(clone);
    
            
            // manage return keyboard press in the barcode input field
            $('#'+ divInfo['id'] + ' .barcode').on('keypress', function(e){
                var key = e.which || e.keyCode;
                if (key === 13) { // 13 is enter
                    $('#'+ divInfo['id'] + ' .btn-info').click();
                }
            });
    
            // load container calling the corresponding api
            $('#'+ divInfo['id'] + ' .btn-info').on('click', function(){
                barcode = $('#'+ divInfo['id'] + ' .barcode').val();
                if (barcode){
                    //console.log(barcode, divInfo['type']);
                    loadContainer(barcode, divInfo['type']).then(function(html){
                        $('#'+ divInfo['id'] + ' .lascontainer').empty();
                        $('#'+ divInfo['id'] + ' .lascontainer').append(html);
                        // add popover to active leaf nodes only
                        $('#'+ divInfo['id'] + ' .lascontainer .btn').popover({
                            container: 'body',
                            'trigger': 'hover',
                            'delay': { "show": 500, "hide": 100 },
                            content: 'info entity',
                            'html': true,
                            'template': '<div class="popover" role="tooltip"><div class="arrow"></div><h4 class="popover-header"></h4><div class="popover-body"></div></div>'
                        });
    
    
                        // add content to popover for container (active leaf nodes only)
                        $('#'+ divInfo['id'] + ' .lascontainer .btn').on('show.bs.popover', '', function(e){
                            $(".popover-body").empty();
                            if ($(this).data('eid')){
                                getEntity($(this).data('eid')).then(function(entityInfo){
                                    listHtml = '<table class="table table-striped" style="width:100%"><tbody>'
                                    if (entityInfo['type'] == 'c')
                                        listHtml+= '<tr><th>Type</th><td>Container</td></tr>'
                                    else
                                        listHtml+= '<tr><th>Type</th><td>Bioentity</td></tr>'
                                    listHtml+= '<tr><th>Identifier</th><td>'+ entityInfo['identifier'] + '</td></tr>'
                                    listHtml+= "</tbody></table>"
                                    $(".popover-body").append(listHtml);
                                });
                            }
                        });
                        $('#'+ divInfo['id'] + ' .lascontainer .btn').popover('disable');
                    });
                }
                else{
                    toastr['error']("No barcode insert");
                }
            
            });
    
            // enable/disable tooltip of container info
            $('#'+ divInfo['id'] + ' input[type="checkbox"].info').on('change', function(){
                if ($(this).prop('checked')){
                    $('#'+ divInfo['id'] + ' .lascontainer .btn').popover('enable');
                }
                else{
                    $('#'+ divInfo['id'] + ' .lascontainer .btn').popover('disable');}
            });

            $('#'+ divInfo['id'] + ' select[name="aliqType"]').on('change', function(){$(this).val()
                infoEntity = aliquotFeatures[$(this).val()]
                formEntity = ''
                for (var i=0; i<infoEntity.length; i++){
                    label = infoEntity[i]['name'].split(/(?=[A-Z])/).join(" ").toLowerCase()
                    label = label.substr(0,1).toUpperCase() + label.substr(1)
                    formEntity += '<div class="form-group"><label>'+ label + '</label><input type="number" name="'+ infoEntity[i]['name'] + '" class="form-control" value=1></div>'
                }
                $('#'+ divInfo['id'] + ' .entityInfo').empty();
                $('#'+ divInfo['id'] + ' .entityInfo').append(formEntity);
            })
            
            // add event handler based on plate action (inc to insert new entities and update feature; dec to decrease feature value until is available)
            switch(divInfo['type']){
                case 'inc':
                    $('#'+ divInfo['id'] + ' .lascontainer').on('click', '.btn-container', putInEntity);
                    break;
                case 'dec':
                    $('#'+ divInfo['id'] + ' .lascontainer').on('click', '.btn-entity', getOutEntity);
                    break;
            }
        });
    }
    
    // add entity if not present or update the related feature
    function putInEntity(){
        //console.log('putInEntity')
        console.log($(this));
        getCurrentTodo().done(function(entityInfo){
            console.log('resolve')
            console.log(entityInfo);
        }).fail( function (){
            toastr["error"]('No current entity is avaliable in the todo list')
        });
    
    }
    
    // decrease related entity feature until is possible
    function getOutEntity(){
        console.log('getOutEntity')
        console.log($(this));
    
    }
    
    // sort container according to root absolute position
    function sortByPos(a, b){
        var aPos = a.root_pos;
        var bPos = b.root_pos; 
        return ((aPos < bPos) ? -1 : ((aPos > bPos) ? 1 : 0));
    }
    
    // render the container according to the data structure. If null a standard visualization if done
    function renderContainer(container, action){
        var html = '';
        if (container == null){
            container = {'children': [],
                'row_label':["A", "B"],
                'column_label': ["1", "2"],
                'features': [],
                'identifier': null,
                'leaf':false,
                'mother':false,
                'oid': null,
                'status': null,
                'type':"c"
            }
        }
        container['children'].sort(sortByPos);
        
        html += '<tr><td class="intest"></td>'
        for (var j=0; j< container['column_label'].length; j++){
            html += '<td align="center" class="intest"><strong>' + container['column_label'][j] + '</strong></td>'
        }
        html += '</tr>'
    
        for (var i=0; i<container['row_label'].length; i++){
            html += '<tr><td align="center" class="intest"><strong>' + container['row_label'][i] + '</strong></td>'
            for (var j=0; j< container['column_label'].length; j++){
                if (action != 'render'){
                    var child = container['children'][i*container['column_label'].length + j];
                    var childInfo = child['childInfo'];
                }
                switch(action){
                    case 'inc':
                        if (childInfo){
                            if (childInfo['type'] == 'b'){
                                html += '<td>' + '<button class="btn btn-entity" align="center" data-rel-id='+ child['id']+' data-eid='+ childInfo['oid'] +' disabled>0</button>' +' </td>'
                            }
                            else{
                                html += '<td>' + '<button class="btn btn-container" align="center" data-rel-id='+ child['id']+' data-eid='+ childInfo['oid'] +' >0</button>' +' </td>'
                            }
                        }
                        else{
                            html += '<td>' + '<button class="btn btn-container" align="center" disabled>X</button>' +' </td>'
                        }
                        break;
                    case 'dec':
                        if (childInfo){
                            if (childInfo['type'] == 'b'){
                                html += '<td>' + '<button class="btn btn-entity" align="center" data-rel-id='+ child['id']+' data-eid='+ childInfo['oid'] +'>0</button>' +' </td>'
                            }
                            else{
                                html += '<td>' + '<button class="btn btn-container" align="center" data-rel-id='+ child['id']+' data-eid='+ childInfo['oid'] +' disabled>0</button>' +' </td>'
                            }
                        }
                        else{
                            html += '<td>' + '<button class="btn btn-container" align="center" disabled>X</button>' +' </td>'
                        }
                        break;
                    case 'render':
                        html += '<td>' + '<button class="btn btn-container" align="center" disabled>#</button>' +' </td>'
                        break;
                }
                
            }
            html += '</tr>'
        }
        
        return html;
    
    }
    
    /*
    load a container calling the api
    example of response:
        containerResponse = {'nodes': [
            {'column_label': ['1', '2'], 'row_label': ['A', 'B'], 'identifier': 'VT1', 'type':'c', 'leaf': false, 'features':[]},
            {'column_label': ['1'], 'row_label': ['A'], 'identifier': 'VT1-1', 'type':'c', 'leaf': true, 'features':[]},
            {'column_label': ['1'], 'row_label': ['A'], 'identifier': 'VT1-2', 'type':'c', 'leaf': true, 'features':[]},
            {'column_label': ['1'], 'row_label': ['A'], 'identifier': 'VT2-1', 'type':'c', 'leaf': true, 'features':[]},
            {'column_label': ['1'], 'row_label': ['A'], 'identifier': 'VT2-2', 'type':'c', 'leaf': true, 'features':[]},
            {'identifier': 'CRCXXXX', 'type':'b', 'features':[{'numpieces': 2}]}
        ], 
        'rel':[
            {'parent': 'VT1', 'child': 'VT1-1', 'position': 'A1' },
            {'parent': 'VT1', 'child': 'VT1-2', 'position': 'A2' },
            {'parent': 'VT1', 'child': 'VT2-1', 'position': 'B1' },
            {'parent': 'VT1', 'child': 'VT2-2', 'position': 'B2' },
            {'parent': 'VT1-2', 'child': 'CRCXXXX', 'position': 'A1' }
        ]
        }
    */
    function loadContainer(barcode, action){
        var dfd = $.Deferred();
        $.ajax({
            url: "/storage/api/getContainer/" + barcode + '/',
        }).done(function(containerResponse) { 
            console.log(containerResponse);
            loadContainerDB(containerResponse).then(function(){
                getEntityByKey(barcode).then(function(rootNode){
                    container = rootNode;
                    container['children'] = [];
                    deferreds = [];
                    for (var i=0; i<container['row_label'].length; i++){
                        for (var j=0; j<container['column_label'].length; j++){
                            pos = container['row_label'][i] + container['column_label'][j];
                            root_pos = i*container['column_label'].length + j;
                            //console.log(root_pos, container['row_label'][i], container['column_label'][j]);
                            deferreds.push(
                                getChildByPos(barcode, pos, null, null, root_pos).done(function(child){
                                    container['children'].push(child);
                                })
                            )
                        }
                    }
                    // wait all the task to retrieve children
                    $.when.apply(null, deferreds).then(function() {
                        dfd.resolve(renderContainer(container, action));
                    });
                });
            });
        });
        return dfd.promise();
    }

    function getAliquotFeatures (){
        var dfd = $.Deferred();
        $.ajax({
            url: "/biobank/api/getAliquotFeatures/"
        }).done(function(resp){
            console.log(resp)
            for (var i=0; i<resp.length; i++){
                if (! (resp[i]['code'] in aliquotFeatures) ){
                    aliquotFeatures[resp[i]['code']] = []
                }
                aliquotFeatures[resp[i]['code']].push(resp[i]);
            }
            console.log(aliquotFeatures)
            dfd.resolve();
        })
        return dfd.promise();
    }
    
    
    // load container form the api of the storage
    function loadContainerDB(containerResponse){
        var dfd = $.Deferred();
        for (var i=0; i<containerResponse['nodes'].length; i++){
            var node = containerResponse['nodes'][i];
            node['mother'] = false;
            node['status'] = 'original';
            putEntity(node);
        }
    
        for (var i=0; i<containerResponse['rel'].length; i++){
            var node = containerResponse['rel'][i];
            node['status'] = 'original';
            putRel(node);
        }
    
        dfd.resolve();
        return dfd.promise();
    }
    
    // insert a new rel in the indexeddb
    function putRel(data){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['relatioships'], "readwrite").objectStore('relatioships');
        var objectStoreRequest = objectStore.put(data);
        objectStoreRequest.onsuccess = function() {
            // grab the data object returned as the result
            var dataPut = objectStoreRequest.result;
            dfd.resolve(dataPut);
        }
        objectStoreRequest.onerror = function(e){
            dfd.resolve();
        }
        return dfd.promise();
    }
    
    // recursive function to get chidlren according to the position
    function getChildByPos(parent, pos, currentRel, deferred, root_pos){
        var dfd = deferred || $.Deferred();
        var objectStore = lasDb.transaction(['relatioships'], "readwrite").objectStore('relatioships');
        var myIndex = objectStore.index('parent');
        var range = IDBKeyRange.only(parent);
        var request = myIndex.openCursor(range);
        request.onsuccess = function() {
            var cursor = request.result;
            //console.log('called', cursor, parent, pos, callback)
            find = false;
            if(cursor){
                //console.log('get call', parent, pos, currentRel, cursor.value.child, cursor.value, callback)
                if (cursor.value['position'] == pos){
                    find = true;
                    getEntityByKey(cursor.value.child).then(function(entity){
                        if (entity['type'] == 'c'){
                            for (var i=0; i<entity['row_label'].length; i++){
                                for (var j=0; j<entity['column_label'].length; j++){
                                    posChild = entity['row_label'][i] + entity['column_label'][j];
                                    getChildByPos (cursor.value.child, posChild, cursor.value, dfd,root_pos);
                                }
                            }
                        }
                        else{
                            //console.log('end recursion', cursor.value);
                            if (cursor.value.child){
                                getEntityByKey(cursor.value.child).then(function(entityInfo){
                                    //console.log(entityInfo);
                                    dataRel = cursor.value;
                                    dataRel['root_pos'] = root_pos;
                                    dataRel['childInfo'] = entityInfo;
                                    //console.log(dataRel)
                                    dfd.resolve(dataRel);
                                });
                            }
                            else{
                                dataRel = cursor.value;
                                dataRel['root_pos'] = root_pos;
                                dataRel['childInfo'] = null;
                                dfd.resolve(dataRel);
                            }
                            
                        }
                    });
                    
                }
                else{
                    if (!find)
                        cursor.continue();
                }
            }
            else{
                //console.log('end recursion', parent, pos, currentRel, root_pos);
                if (currentRel){
                    getEntityByKey(currentRel.child).then(function(entityInfo){
                        currentRel['childInfo'] = entityInfo;
                        currentRel['root_pos'] = root_pos;
                        dfd.resolve(currentRel);
                    });
                }
                else{
                    currentRel = {'parent': parent, 'position': pos, 'child': null, 'id':null}
                    currentRel['root_pos'] = root_pos;
                    currentRel['childInfo'] = null;
                    dfd.resolve(currentRel);
                }
                
            }
        }
        return dfd.promise();
    }
    
    // get an entity given the id
    function getEntity(id){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var objectStoreRequest = objectStore.get(id);
        objectStoreRequest.onsuccess= function (){
            dfd.resolve(objectStoreRequest.result);
        }
        return dfd.promise();
    }
    
    // // get an entity given the identifier
    function getEntityByKey(key){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var myIndex = objectStore.index('identifier'); 
        var getRequest = myIndex.get(key);
        getRequest.onsuccess = function() {
            dfd.resolve(getRequest.result);
        }
        return dfd.promise();
    }
    
    // insert a new entity. If the entity is a mother, the system insert it into the todo list
    function putEntity(data){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var objectStoreRequest = objectStore.put(data);
        objectStoreRequest.onsuccess = function() {
            // grab the data object returned as the result
            var dataPut = objectStoreRequest.result;
            if (data['mother'] == true){
                getEntity(dataPut).then(function(data){
                    addTodo(data);
                });
            dfd.resolve(dataPut);
            }
        }
        return dfd.promise();
    }
    
    // delete a todo entry and the corresponding aliquot
    function deleteTodo(id){
        var transaction = lasDb.transaction(['todo'], "readwrite");
        var request = transaction.objectStore("todo").delete(id);
        transaction.oncomplete = function(){
            var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
            var objectStoreRequest = objectStore.get(id);
            objectStoreRequest.onsuccess= function (){
                var transactionEntity = lasDb.transaction(['entity'], "readwrite");
                var requestEntity = transactionEntity.objectStore("entity").delete(id);
                transactionEntity.oncomplete = function(){
                    refreshCardList();
                }
                transactionEntity.onerror = function(){
                    transactionEntity.abort();
                    transaction.abort();
                }
            }
        }
    }
    
    // update the status of a todo element
    function updateTodoStatus(id, status){
        var objectStoreTodo = lasDb.transaction(['todo'], "readwrite").objectStore('todo');
        var objectStoreRequest = objectStoreTodo.get(id);
        objectStoreRequest.onsuccess = function (){
            var data = objectStoreRequest.result;
            data.status = status;
            if (status == 'current'){
                var index = objectStoreTodo.index('status'); 
                var getRequest = index.get('current');
                getRequest.onsuccess = function() {
                    cursor = getRequest.result;
                    if (cursor){
                        cursor.status = 'pending';
                        allPending = objectStoreTodo.put(cursor);
                        allPending.onsuccess = function (){
                            objectStoreRequestCurr = objectStoreTodo.put(data);
                            objectStoreRequestCurr.onsuccess = function (){
                                refreshCardList();
                            }
                        }
                    }
                    else{
                        objectStoreRequestCurr = objectStoreTodo.put(data);
                        objectStoreRequestCurr.onsuccess = function (){
                            refreshCardList();
                        }
                    }
                }
            }
        }
    }
    
    // clear all db. To call when the data have been processed corretly to the view
    function clearDb(){
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var objectStoreRequest = objectStore.clear();
        var objectStore = lasDb.transaction(['todo'], "readwrite").objectStore('todo');
        var objectStoreRequest = objectStore.clear();
        var objectStore = lasDb.transaction(['log'], "readwrite").objectStore('log');
        var objectStoreRequest = objectStore.clear();
        var objectStore = lasDb.transaction(['relatioships'], "readwrite").objectStore('relatioships');
        var objectStoreRequest = objectStore.clear();
    }
    
    // add a todo element if no current is present the requested element is selected
    function addTodo(data){
        var objectStoreTodo = lasDb.transaction(['todo'], "readwrite").objectStore('todo');
        var index = objectStoreTodo.index('status'); 
        var getRequest = index.get('current');
        getRequest.onsuccess = function() {
            var cursor = getRequest.result;
            if (!cursor){
                data['status'] = 'current';
            }
            else{
                data['status'] = 'pending';
            }
            var objectStoreRequest = objectStoreTodo.put(data);
            objectStoreRequest.onsuccess = function (){
                n = parseInt($('#headingTodo .badge-info').text());
                parseInt($('#headingTodo .badge-info').text(n+1));
                refreshCardElement(data);
                $('#'+ lasData['card']).removeClass('reload');
                $('#'+ lasData['card']).show();
                $('#'+ lasData['card']).addClass('reload');
            }
        }
    }
    
    // refresh card with all the information retirved from the indexdb
    function refreshCardList(){
        var objectStore = lasDb.transaction(['todo'], "readonly").objectStore('todo');
        var objectStoreRequest =objectStore.getAll();
        $('#'+ lasData['card']).hide();
        $('#'+ lasData['card']).removeClass('reload');
        
        $('#cardlasCurrent .card-body').empty();
        $('#cardlasCurrent .card-header span').text('');
        $('#collapseTodo .list-group').empty();
        objectStoreRequest.onsuccess = function (event){
            res = objectStoreRequest.result;
            $('#headingTodo .badge-info').text(res.length);
            for (var i in res){
                refreshCardElement(res[i]);
            };
            $('#'+ lasData['card']).show();
            $('#'+ lasData['card']).addClass('reload');
        }
    }
    
    // return a table striped with all the information excpet some predefined excluded entries
    function toList(data){
        listHtml = '<table class="table table-striped" style="width:100%"><tbody>'
        for (k in data){
            if ($.inArray(k , ['oid', 'mother', 'generated', 'status']) == -1){
                listHtml+= '<tr><th>' + k + '</th><td>'+ data[k] + '</td></tr>'
            }
        }
        listHtml+= "</tbody></table>"
        return listHtml;
    }
    
    // update an element of the todo list according to the status attribute
    function refreshCardElement(data){
        switch (data['status']){
            case 'current':
                $('#cardlasCurrent .card-header span').text(data['identifier']);
                //console.log(data);
                $('#cardlasCurrent .card-body').append(toList(data));
                $('#collapseTodo .list-group').append('<li class="list-group-item">' + data['identifier'] +' <button class="btn btn-warning float-right oi oi-check ml-1" disabled data-oid="' + data['oid'] + '"></button><button class="btn btn-danger float-right oi oi-trash ml-1" data-oid="' + data['oid'] + '"></button> </li>');
                break;
            case 'pending':
                $('#collapseTodo .list-group').append('<li class="list-group-item">' + data['identifier'] +' <button class="btn btn-primary float-right oi oi-check ml-1" data-oid="' + data['oid'] + '"></button><button class="btn btn-danger float-right oi oi-trash ml-1" data-oid="' + data['oid'] + '"></button> </li>');
                break;
            case 'done':
                $('#collapseTodo .list-group').append('<li class="list-group-item">' + data['identifier'] +' <button class="btn btn-success float-right oi oi-check ml-1" data-oid="' + data['oid'] + '"></button><button class="btn btn-danger float-right oi oi-trash ml-1" data-oid="' + data['oid'] + '"></button> </li>');
                break;
        }
    }
    
    
    function getCurrentTodo(){
        var dfd = $.Deferred();
        var objectStoreTodo = lasDb.transaction(['todo'], "readwrite").objectStore('todo');
        var index = objectStoreTodo.index('status'); 
        var getRequest = index.get('current');
        console.log('getCurrentTodo');
        getRequest.onsuccess = function() {
            var cursor = getRequest.result;
            console.log(cursor)
            if (cursor){
                dfd.resolve(cursor)
            }
            else
                dfd.reject();
        }
        return dfd.promise();
    }
    
    // called when I want to proceed with next entity in the todo list
    function nextTodo(){
        var objectStoreTodo = lasDb.transaction(['todo'], "readwrite").objectStore('todo');
        var index = objectStoreTodo.index('status'); 
        var getRequest = index.get('current');
        //console.log('nextTodo');
        getRequest.onsuccess = function() {
            var cursor = getRequest.result;
            if (cursor){
                cursor.status = 'done';
                var objectStoreRequest = objectStoreTodo.put(cursor);
                objectStoreRequest.onsuccess = function (){
                    getNextTodoRecord(objectStoreTodo, cursor.oid, function(data){
                        if (data){
                            updateTodoStatus(data.oid, 'current')
                        }
                        else{
                            getNextTodoRecord(objectStoreTodo, undefined, function(dataFirst){
                                if (dataFirst){
                                    updateTodoStatus(dataFirst.oid, 'current');
                                }
                                else{
                                    toastr['info']("All entities have been processed");
                                }
                            })
                        }
                    });
                }
            }
            else{
                getNextTodoRecord(objectStoreTodo, undefined, function(dataFirst){
                    if (dataFirst){
                        updateTodoStatus(dataFirst.oid, 'current');
                    }
                    else{
                        toastr['info']("All entities have been processed");
                    }
                });
            }
        }
    }
    
    // find the next record in the todo list wiht status pending
    function getNextTodoRecord(index, currentKey, callback) {
        var range;
        if (currentKey === undefined) {
            range = null; // unbounded
        } else {
            range = IDBKeyRange.lowerBound(currentKey, true); // exclusive
        }
        var request = index.openCursor(range);
        request.onsuccess = function(e) {
            var cursor = request.result;
            if (!cursor) {
                // no records found/hit end of range
                callback();
                return;
            }
            else{
                // yay, found a record. remember the key for next time
                if (cursor.value.status != 'done'){
                    callback(cursor.value);
                    return;
                }
                cursor.continue();
            }
        };
    }

    return {

        init: function(info) {
            if(!lasData){
                lasData = initPage(info);
            }
            return lasData;
        },
        putEntity: putEntity,
        clearDb: clearDb
    }
})();





