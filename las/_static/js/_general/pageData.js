const LASData = (function() {
    let lasData 
    let lasDb = null;

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
            if (lasData['summary']){
                initSummary();
            }
            if (lasData['card']){
                initCardEntity();
            }
            
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

    function getEntity(id){
        var dfd = $.Deferred();
        var objectStore = lasDb.transaction(['entity'], "readwrite").objectStore('entity');
        var objectStoreRequest = objectStore.get(id);
        objectStoreRequest.onsuccess= function (){
            dfd.resolve(objectStoreRequest.result);
        }
        return dfd.promise();
    }


    function initSummary(){
        $.get("/las_static/templates/summary.html", function( data ) {
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