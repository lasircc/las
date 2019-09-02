var GenealogyId = (function() {
    // Private variables and functions
    var _genID = "";
    var _indexes = {'origin':[0,3], 'caseCode':[3,4], 'tissue':[7,2], 'sampleVector':[9,1], 'lineage':[10,2], 'samplePassage':[12,2], 'mouse':[14,3], 'tissueType':[17,3], 'implantSite':[17,3], 'archiveMaterial1': [20,1], 'archiveMaterial2': [20,2], 'aliqExtraction1':[21,2], 'aliqExtraction2':[22,2], '2derivation': [23,1], '2derivationGen':[24,2]}
    
    var init = function(data){
        _genID = data;
        return this;
    }
    
    var getDictionary = function(listIndex){
        var resp = {};
        if (listIndex == undefined){
            listIndex = Object.keys(_indexes);
        }
        for (var i=0; i<listIndex.length; i++){
            k = listIndex[i];
            resp[k] = _genID.slice(_indexes[k][0], _indexes[k][0]+_indexes[k][1] )
        }
        return resp;
    }
 
    // Public API
    return {
        init: init,
        getDictionary: getDictionary,
    };
})();