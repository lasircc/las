from .__init__ import *



@csrf_exempt
def generate_report(request):
    try:
        print(request.POST['tabledata'])
        dataTable = json.loads(request.POST['tabledata'])
        formatFile = dataTable['fileformat']
        filename = dataTable['filename']
        print(formatFile, filename)
        result = StringIO.StringIO()
        if formatFile == 'pdf':
            filename += '.pdf'
            html  = render_to_string('reportPdf.html', { 'pagesize' : 'landscape', 'header':dataTable['header'], 'body':dataTable['body'], 'title':dataTable['title']}, context_instance=RequestContext(request))
            pdf = pisa.CreatePDF(StringIO.StringIO(html.encode("UTF-8")), dest=result )
	    #pdf = pisa.CreatePDF(StringIO.StringIO(html.encode("UTF-8")), dest=result, link_callback=fetch_resources)
            if pdf.err:
                raise Exception("error in rendering pdf")
        elif formatFile == 'las':
            filename += '.las'
            result.write('\t'.join([h['title'] for h in dataTable['header']]))
            result.write('\n')
            for row in dataTable['body']:
                result.write('\t'.join([str(cell['data']) for cell in row]))
                result.write('\n')
        elif formatFile == 'data':
            filename += '.data'
            for row in dataTable['body']:
                result.write('\t'.join([str(cell['data']) for cell in row]))
                result.write('\n')
        elif formatFile == 'excel':
            filename += '.xls'
            wbk = xlwt.Workbook()
            sheet = wbk.add_sheet('Data')
            fontBold = xlwt.Font()
            fontBold.bold = True
            patternH = xlwt.Pattern() # Create the Pattern 
            patternH.pattern = xlwt.Pattern.SOLID_PATTERN # May be: NO_PATTERN, SOLID_PATTERN, or 0x00 through 0x12 
            patternH.pattern_fore_colour = 22 # May be: 8 through 63. 0 = Black, 1 = White, 2 = Red, 3 = Green, 4 = Blue, 5 = Yellow, 6 = Magenta, 7 = Cyan, 16 = Maroon, 17 = Dark Green, 18 = Dark Blue, 19 = Dark Yellow , almost brown), 20 = Dark Magenta, 21 = Teal, 22 = Light Gray, 23 = Dark Gray, the list goes on... 
            patternC = xlwt.Pattern()
            patternC.pattern = xlwt.Pattern.SOLID_PATTERN
            patternC.pattern_fore_colour = 5
            styleHeader = xlwt.XFStyle()
            styleHeader.pattern = patternH
            styleHeader.font = fontBold
            styleCell = xlwt.XFStyle()
            styleCell.pattern = patternC
            row = 0
            col = 0
            for h in dataTable['header']:
                sheet.write(row, col, str(h['title']), styleHeader)
                col +=1
            row += 1
            for r in dataTable['body']:
                col = 0
                for cell in r:
                    dCell = cell['data']
                    try:
                        float(dCell)
                        dCell = float(dCell)
                    except ValueError:
                        pass
                    if 'highsel' in cell['class'].strip():
                        sheet.write(row, col, dCell, styleCell)
                    else:
                        sheet.write(row, col, dCell)
                    col+=1
                row +=1
            print('fff')
            wbk.save(result) # write to stdout
        response = HttpResponse(result.getvalue(), mimetype='application/octet-stream')
        response['Content-Disposition'] = 'attachment; filename=' + filename
        return response
    except Exception as e:
        print("exception",e)
        return HttpResponseBadRequest("Page not available")



def fetch_resources(uri, rel):
    path = os.path.join(settings.MEDIA_ROOT, uri.replace(settings.MEDIA_URL, ""))
    return path


def underConstruction(request):
    return render(request, 'underConstruction.html') 

def demoDocumentation(request):
    return render(request, 'demoDocumentation.html')



@login_required
def video(request):
    mainActivities = Activity.objects.filter(father_activity__isnull=True)
    mAct = {}
    try:
        for ma in mainActivities:            
            videos = LASVideo.objects.filter (activity__in= Activity.objects.filter(father_activity = ma ).values_list('id',flat=True) ).order_by('activity', 'rank')
            activities = {}
            print(ma.id)
            if len(videos):
                mAct[ma.id] = {'name':ma.name, 'activities':[], 'videos':[], 'id': ma.id }
                vList = []
                for v in videos:
                    video={}
                    video['id']=v.id
                    video['title']=v.title
                    video['description']=v.description
                    video['url']=v.url
                    video['position']=v.rank
                    video['activity']=v.activity.id
                    vList.append(video)
                    activities[v.activity.id] = v.activity.name
                act = []
                for key in sorted(activities):
                    act.append({'id':key, 'name': activities[key]})
                
                mAct[ma.id]['activities'] = act
                mAct[ma.id]['videos'] = vList
    except Exception as e:
        print(e)
        return HttpResponseBadRequest('Error in retrieving data')

    mAct_sort = []
    for key in sorted(mAct):
        mAct_sort.append(mAct[key])
    
    print(mAct_sort)
    return render(request, 'videoPage.html', {'mainActivities':mAct_sort})
    


def privacyView(request):
    return render(request, 'home/privacy.html')


def helpdesk(request):
    return redirect(settings.HELPDESK)
