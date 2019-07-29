from django.shortcuts import render

# Create your views here.
from .mongodb import connections, connection, db, to_json
from django.conf import settings



def normalizePagResult (documents):
    if len(documents['count']) == 0:
        documents['count'] = 0
    else:
        documents['count'] = documents['count'][0]['count']
    return documents

def paginate(doc, userAccess, start= 0, length = settings.REST_FRAMEWORK['PAGE_SIZE'], startFilter={}, filter={}) :
    print (doc)

    finalFilter = {**startFilter, **filter}

    aggregationPipeline = [
        { '$match': startFilter }
    ]
    aggregationPipelineFilter = [
        { '$match': finalFilter }
    ]

    if userAccess is not None:
        redactStage = { '$redact': {
                '$cond': {
                    'if': {
                        '$gt': [ {'$size': { '$ifNull': [
                            {
                            '$setIntersection': 
                                [ "$access_w", 
                                userAccess 
                                ] 
                            }, [] ]
                        } }, 0]
                    },
                    'then': "$$KEEP",
                    'else': "$$PRUNE"
                    }
                }
            }
        aggregationPipeline.append(redactStage)
        aggregationPipelineFilter.append(redactStage)
    
    paginationStage = {'$facet': {
            'data': [ { '$skip': start }, { '$limit': length } ],
            'count': [ {'$count': 'count'} ]
            }
    }
    
    aggregationPipeline.append(paginationStage)
    aggregationPipelineFilter.append(paginationStage)


    documentsTotal = db[doc].aggregate(aggregationPipeline)
    documents = db[doc].aggregate(aggregationPipelineFilter)

    documentsTotal = normalizePagResult(list(documentsTotal)[0])
    documents = normalizePagResult(list(documents)[0])

    resp = {
        'recordsTotal': to_json(documentsTotal),
        'recordsFiltered': to_json(documents),
        'start': start,
        'lenght': length
    }
    return resp