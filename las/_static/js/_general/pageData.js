const LASData = (function() {
    let lasData 
    let lasDb = null;
    let csrf = document.getElementsByName('csrfmiddlewaretoken')[0].value

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

    // called by init function. Initializa db and the page elements if configured
    function _initPage(info){

        lasData = info;
        const object = new Object(lasData);

        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        currentCsrf = sessionStorage.getItem("csrf");
        sessionStorage.setItem("csrf", csrf);
        console.log(currentCsrf, csrf)
        
        
        
    
        var DBOpenRequest = window.indexedDB.open(lasData['db'],1)
    
        DBOpenRequest.onsuccess = function(){
            lasDb = DBOpenRequest.result;

            _checkExistingData().then(function(error, checkFlag){
                restoredDataFlag = sessionStorage.getItem( "restoredData");
                if (restoredDataFlag){
                    $.ajax({
                        type:'put',
                        url: "/entity/sessionData/",
                        data: {'old': currentCsrf, 'new': csrf}
                    }).done(function(){
                        sessionStorage.removeItem("restoredData");
                        _initPageElements();
                    });                    
                }
                else{
                    if (checkFlag){
                        _dialogPage();
                    }
                    else{
                        $.ajax({
                            type:'delete',
                            url: "/entity/sessionData/",
                            data: {'csrf': currentCsrf}
                        }).done(function(){
                            _initPageElements();
                        });
                    }
                }
            });

        }
    
        DBOpenRequest.onupgradeneeded = function(event){
            var db = event.target.result;
            if (!db.objectStoreNames.contains('entity')) {
                objStore = db.createObjectStore('entity', {keyPath: '_id.$oid'});
                objStore.createIndex("identifier", "identifier", { unique: true });
            }
            if (!db.objectStoreNames.contains('todo')) {
                objStore = db.createObjectStore('todo', {keyPath: 'oid'});
                objStore.createIndex("status", "status", { unique: false });
            }
            if (!db.objectStoreNames.contains('log')) {
                db.createObjectStore('log', {keyPath: 'id', autoIncrement: true});
            }
            if (!db.objectStoreNames.contains('relationships')) {
                objStore = db.createObjectStore('relationships', {keyPath: '_id.$oid'});
                objStore.createIndex("parent", 'parent', { unique: false });
                objStore.createIndex("child", 'child', { unique: false });
                objStore.createIndex("rel", ['parent', 'child'] ,{ unique: true });
            }
        }

        return object;
    
        
    }

    function _initPageElements(){
        if (lasData['summary']){
            _initSummary();
        }
        if (lasData['card']){
            _initCardEntity();
        }
        if (!lasData['finish']){
            lasData['finish'] = {'div': 'content', 'href': '/'};
        }
        _initFinish();
        _initAdvancedOptions();
    }

    /*
    [private] Init finish button
    */
    function _initFinish(){
        t = '<div class="finishSession text-right mt-2"><button class="btn btn-success">Save</button></div>'
        $('#'+ lasData['finish']['div']).prepend(t);
        $('#'+ lasData['finish']['div'] + ' button').on('click', function(){
            _getData().then(function(error, jsonString){
                console.log(error, jsonString);
                if (!error){
                    $.ajax({
                        type: 'post',
                        url: '/entity/sessionData/',
                        data : {
                            'viewname': lasData['db'],
                            'csrf': csrf,
                            'data': JSON.stringify(jsonString)
                        }

                    }).done(function(){
                        _deleteDb().then(function(){
                            sessionStorage.removeItem("csrf");
                            window.location = lasData['finish']['href'];
                        });
                    })
                    
                    
                }            
            })
        })
    }

    function _initAdvancedOptions(){
        $('#footerLAS').prepend('<span class="navbar-text ml-auto fa fa-cog" id="advacedConf" style="cursor:pointer"></span>');
        $('#advacedConf').on('click', function(){
            console.log('advanced options');
            $('#modalAdvanced').modal('show');
        })
        $.get("/las_static/templates/advancedModal.html", function( data ) {
            t = $.parseHTML(data)[0]
            var clone = document.importNode(t.content, true);
            $('#content').append(clone);

            $('#restoreDataPage').on('click', function(){
                console.log('restoreData');
                $('#modalAdvanced').modal('hide');
            });

            $('#modalAdvanced').on('hidden.bs.modal', function (e) {
                console.log('restore close')
                var reader = new FileReader();
                fileToLoad = $('#advancedSessionData')[0].files[0] 
                reader.onload = function(fileLoadedEvent) {
                    var textFromFileLoaded = fileLoadedEvent.target.result;
                    data = JSON.parse(textFromFileLoaded);
                    console.log(data);
                    _clearDb().then(function(){
                        _restoreDb(data).then(function(event, success){
                            console.log(event, success);
                            if (success){
                                sessionStorage.setItem( "restoredData", true );
                                location.reload();
                            }
                        });
                    });
                };
                reader.readAsText(fileToLoad, 'UTF-8');

            });
        });
    }
    
    /*
    [private] init table for summary (log)
    */
    function _initSummary(){
        $.get("/las_static/templates/summary.html", function( data ) {
            t = $.parseHTML(data)[0]
            var clone = document.importNode(t.content, true);
            $('#'+ lasData['summary']['div']).append(clone);
            if ('header' in lasData['summary'])
                columnsDef = lasData['summary']['header'];
            else
                columnsDef = [];
            columnsDef.splice(0,0, {"title": "Delete", "data": "id", "render": function ( data, type, row, meta ) {
                return "<button class='close' style='float:left' type='button' data-logid='" + data + "'><span aria-hidden='true' style='color:#c82333'>&times;</span></button>";}});
            columnsDef.splice(1,0, {"title": "ID Operation", "data": "id"})
            columnsDef.splice(2,0, {"title": "Identifier", "data": "identifier"})

            var objectStore = lasDb.transaction(['log'], "readonly").objectStore('log');
            var objectStoreRequest =objectStore.getAll();
            objectStoreRequest.onsuccess = function(){
                $('#'+ lasData['summary']['div'] + ' table').DataTable({
                    "data": objectStoreRequest.result,
                    "paging":   true,
                    "ordering": true,
                    "info":     true,
                    "columns": columnsDef
                });

                $('#' + lasData['summary']['div'] + ' tbody').on( 'click', 'button.close', function () {
                    logid = $(this).data('logid')
                    if (lasData['summary']['deleteCb']){ //call callback function if available
                        lasData['summary']['deleteCb'](logid);
                    }
                    else{
                        console.log($(this).parents('tr'))
                        $('#' + lasData['summary']['div'] + ' table').DataTable().row( $(this).parents('tr')[0] ).remove().draw(false);
                        getLog(logid).then(function(data){
                            deleteLog(logid);
                            getEntityByKey(data['identifier']).then(function(data){
                                deleteEntity(data['_id']['$oid']);
                            });
                        });
                    }
                });
            }
        });
    }

    /*
    [private] init card with todo list and current entity
    */
    function _initCardEntity(){
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


    function _dialogPage(){
        $.get("/las_static/templates/modalPage.html", function( data ) {
            t = $.parseHTML(data)[0]
            var clone = document.importNode(t.content, true);
            $('#content').append(clone);

            $('#modalPageLas').modal('show');
            $('#mPageDestroyFlag').val(false);
            

            $('#destroyDataPage').on('click', function(){
                console.log('destroy');
                $('#mPageDestroyFlag').val(true);
                $('#modalPageLas').modal('hide');
            });

            $('#modalPageLas').on('hidden.bs.modal', function (e) {
                if ($('#mPageLasDownload').prop('checked')){
                    if ('Blob' in window) {
                        var fileName = lasData['db'] + '.json';
                        _getData().then(function(error, jsonString){
                            if (!error){
                                var textFileAsBlob = new Blob([JSON.stringify(jsonString)], { type: 'text/plain' });
                        
                                if ('msSaveOrOpenBlob' in navigator) {
                                    navigator.msSaveOrOpenBlob(textFileAsBlob, fileName);
                                } 
                                else {
                                    var downloadLink = document.createElement('a');
                                    downloadLink.download = fileName;
                                    downloadLink.innerHTML = 'Download File';
                                    
                                    if ('webkitURL' in window) {
                                    // Chrome allows the link to be clicked without actually adding it to the DOM.
                                    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                                    } 
                                    else {
                                        // Firefox requires the link to be added to the DOM before it can be clicked.
                                        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                                        downloadLink.click(function(){
                                            document.body.removeChild(event.target);
                                        }); 
                                    
                                        downloadLink.style.display = 'none';
                                        document.body.appendChild(downloadLink);
                                    }
                                    downloadLink.click();
                                }
                            }
                            if($('#mPageDestroyFlag').val() == "true"){
                                $.ajax({
                                    type:'delete',
                                    url: "/entity/sessionData/",
                                    data: {'csrf': currentCsrf}
                                }).done(function(){
                                    _clearDb().then(function(){
                                        _initPageElements();
                                    });
                                });
                                
                            }
                            else{
                                $.ajax({
                                    type:'put',
                                    url: "/entity/sessionData/",
                                    data: {'old': currentCsrf, 'new': csrf}
                                }).done(function(){
                                    _initPageElements();
                                });
                            }

                        });

                    } 
                    else {
                        toastr["warning"]('Your browser does not support to create dump of session');
                    }
                }
                else{
                    if($('#mPageDestroyFlag').val() == "true"){
                        $.ajax({
                            type:'delete',
                            url: "/entity/sessionData/",
                            data: {'csrf': currentCsrf}
                        }).done(function(){
                            _clearDb().then(function(){
                                _initPageElements();
                            });
                        });
                        
                    }
                    else{
                        $.ajax({
                            type:'put',
                            url: "/entity/sessionData/",
                            data: {'old': currentCsrf, 'new': csrf}
                        }).done(function(){
                            _initPageElements();
                        });
                    }
                }
            });
        });
    }

    // ------------entity functions ---------------
    /*
    insert new entity
    */
    function addEntity(data){
        var dfd = $.Deferred();
        
         $.ajax({
            type:'post',
            url: "/entity/docSession/",
            data: {'csrf': csrf, 'type': 'entity', 'doc': JSON.stringify(data)}
        }).done(function(response){
            var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
            var objectStoreRequest = objectStore.put(response['doc']);
            objectStoreRequest.onsuccess = function() {
                // grab the data object returned as the result
                var dataPut = objectStoreRequest.result;
                if (data['mother'] == true){ // to think about
                    getEntity(dataPut).then(function(data){
                        addTodo(data);
                    });
                }
                dfd.resolve(response['doc']);
            }
            objectStoreRequest.onerror = function(){
                console.log("There has been an error with retrieving your data: " + objectStoreRequest.error);
                toastr['error']("Entity already insert!");
                dfd.reject();
            }

        }).fail(function(response){
            console.log(response);
            toastr['error'](response.responseJSON['error']);
        })

        
        return dfd.promise();
    }
    
    /*
    get entity data according to the internal id
    */
    function getEntity(id){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var objectStoreRequest = objectStore.get(id);
        objectStoreRequest.onsuccess= function (){
            dfd.resolve(objectStoreRequest.result);
        }
        return dfd.promise();
    }

    /*
    get entity data according to the identifier attribute
    */
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

    /*
    delete an entity and all its relationships
    */
    function deleteEntity(id){
        var dfd = $.Deferred();
        $.ajax({
            type:'delete',
            url: "/entity/docSession/",
            data: {'csrf': csrf, 'type': 'entity', 'id': id}
        }).done(function(){
            var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
            var objectStoreRequest = objectStore.delete(id);
            objectStoreRequest.onsuccess= function (){
                deleteRel(id).then(function(){
                    dfd.resolve();
                });            
            }
        })
        
        return dfd.promise();
    }

    // ------------log functions --------------

    /*
    insert new log entry
    */
    function addLog(data){
        var dfd = $.Deferred();
        var objectStoreLog = lasDb.transaction(['log'], "readwrite").objectStore('log');
        var objectStoreRequest = objectStoreLog.put(data);
        objectStoreRequest.onsuccess = function() {
            // grab the data object returned as the result
            var dataPut = objectStoreRequest.result;
            getLog(dataPut).then(function(data){
                $('#'+ lasData['summary']['div']+ ' table').DataTable().row.add(data).draw( false );
            });
            dfd.resolve(dataPut);
        }
        return dfd.promise();
    }

    /*
    get log entry
    */
    function getLog(id){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['log'], "readwrite").objectStore('log');
        var objectStoreRequest = objectStore.get(id);
        objectStoreRequest.onsuccess= function (){
            dfd.resolve(objectStoreRequest.result);
        }
        return dfd.promise();
    }

    /*
    delete log entry according to the id
    */
    function deleteLog(id){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['log'], "readwrite").objectStore('log');
        var objectStoreRequest = objectStore.delete(id);
        objectStoreRequest.onsuccess= function (){
            dfd.resolve();
        }
        return dfd.promise();
    }

    // ------------todo functions --------------

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

    // ------------relationships functions --------------

    /*
    delete relationships based on the entity id
    */
    function deleteRel(entityId){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['relationships'], "readwrite").objectStore('relationships');
        var indexParent = objectStore.index('parent'); 
        var deleteCursorParentRequest = indexParent.openCursor(entityId);
        deleteCursorParentRequest.onsuccess = function(event) {
            var cursor = event.target.result;
            if(cursor) {
                cursor.delete();
                cursor.continue();
            }
            else{
                var indexChild = objectStore.index('child'); 
                var deleteCursorChildRequest = indexChild.openCursor(entityId);
                deleteCursorChildRequest.onsuccess = function(event) {
                    var cursor = event.target.result;
                    if(cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                    else{
                        dfd.resolve();
                    }
                }
            }
        }
        
        return dfd.promise();

    }

    // ------------database functions --------------
    
    /*
    [private] get all data stored in the collections
    */
    function _getData(){
        var dfd = $.Deferred();
        var exportObject = {};
        if(lasDb.objectStoreNames.length === 0)
            dfd.resolve(null, exportObject);
        else {
            var transaction = lasDb.transaction(lasDb.objectStoreNames, "readonly");
            transaction.onerror = function(event) {
                dfd.resolve(event, null);
            };
            _.each(lasDb.objectStoreNames, function(storeName) {
                var allObjects = [];
                transaction.objectStore(storeName).openCursor().onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        allObjects.push(cursor.value);
                        cursor.continue();
                    } else {
                        exportObject[storeName] = allObjects;
                        if(lasDb.objectStoreNames.length === _.keys(exportObject).length) {
                            dfd.resolve(null, exportObject);
                        }
                    }
                };
            });
        }

        return dfd.promise();
    }

    function _checkExistingData(){
        var dfd = $.Deferred();
        var checkFlag = false;
        if(lasDb.objectStoreNames.length === 0)
            dfd.resolve(null, checkFlag);
        else {
            var transaction = lasDb.transaction(lasDb.objectStoreNames, "readonly");
            transaction.onerror = function(event) {
                dfd.resolve(event, null);
            };
            _.each(lasDb.objectStoreNames, function(storeName) {
                var allObjects = [];
                transaction.objectStore(storeName).openCursor().onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {

                        var checkFlag = true;
                        dfd.resolve(null, checkFlag);
                        cursor.continue();
                    } else {
                        dfd.resolve(null, checkFlag);
                    }
                };
            });
        }

        return dfd.promise();

    }

    /*
    [private] delete the database
    */
    function _deleteDb(){
        var dfd = $.Deferred();
        lasDb.close(lasData['db']);
        
        var DBDeleteRequest = window.indexedDB.deleteDatabase(lasData['db'],1)
        DBDeleteRequest.onerror = function(event) {
            console.log("Error deleting database.");
            dfd.reject();
        }
        
        DBDeleteRequest.onsuccess = function(event) {
            console.log("Database deleted successfully");
            dfd.resolve();
        }
    
        
        return dfd.promise();
        
    }


    function _clearDb(){
        var dfd = $.Deferred();
        var exportObject = {};
        if(lasDb.objectStoreNames.length === 0)
            dfd.resolve(null, true);
        else {
            var transaction = lasDb.transaction(lasDb.objectStoreNames, "readwrite");
            transaction.onerror = function(event) {
                dfd.resolve(event, null);
            };
            _.each(lasDb.objectStoreNames, function(storeName) {
                var allObjects = [];
                transaction.objectStore(storeName).clear().onsuccess = function() {
                    exportObject[storeName] = true;
                    if(lasDb.objectStoreNames.length === _.keys(exportObject).length) {
                        dfd.resolve(null, true);
                    }
                };
            });
        }
        return dfd.promise();
    
    }

    function _putNext(transaction, storeName, data, i){
        var dfd = $.Deferred();
        console.log(i, data.length)
        if (i<data.length){
            transaction.objectStore(storeName).put(data[i]).onsuccess = _putNext(transaction, storeName, data, ++i);
        } 
        else {   // complete
            console.log('populate complete', storeName);
            dfd.resolve(storeName);
        }
        return dfd.promise();
    }

    function _restoreDb(data){
        var dfd = $.Deferred();
        if(lasDb.objectStoreNames.length === 0)
            dfd.resolve(null, true);
        else {
            var transaction = lasDb.transaction(lasDb.objectStoreNames, "readwrite");
            transaction.onerror = function(event) {
                dfd.resolve(event, null);
            };
            var importObject = [];
            _.each(lasDb.objectStoreNames, function(storeName) {
                _.each(data[storeName], function(item){
                    if (storeName == 'entity'){
                        importObject.push( addEntity(item) );
                    }
                    else{
                        importObject.push( transaction.objectStore(storeName).put(item) );
                    }
                    
                })
            });
            $.when(importObject).done(function(){
                dfd.resolve(null, true);
            })
        }
        return dfd.promise();

    }




    return {

        init: function(info) {
            if(!lasData){
                lasData = _initPage(info);
            }
            return lasData;
        },
        addEntity: addEntity,
        getEntity: getEntity,
        getEntityByKey: getEntityByKey,
        addLog: addLog,
    }

})();