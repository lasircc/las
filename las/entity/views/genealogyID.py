from . import *

class GenealogyID ():
    def __init__ (self,genID=''):
        if len (genID) < 26:
            genID = genID + (26-len(genID))*'-'
        elif len (genID) > 26:
            genID = '--------------------------'
        
        self._genID = genID
        # tuple with start index and lenght of the code
        self._indexes= {'origin':(0,3), 'caseCode':(3,4), 'tissue':(7,2), 'sampleVector':(9,1), 'lineage':(10,2), 'samplePassage':(12,2), 'mouse':(14,3), 'tissueType':(17,3), 'implantSite':(17,3), 'archMatDer': (20,1), 'archMatOrigin': (20,2), 'aliqDerCounter':(21,2), 'aliqOrigCounter':(22,2), 'aliq2Der': (23,1), 'aliq2DerCounter':(24,2)}
        self.archMaterialType = None
        

    def _getArchMat(self):
        return self.archMaterialType

    def defineArchMaterial(self, v):
        if v:
            if len(v) == self._indexes['archMatOrigin'][1]:
                self.archMaterialType = 'archMatOrigin'
            elif len(v) == self._indexes['archMatDer'][1]:
                self.archMaterialType = 'archMatDer'
            elif len(v) == 3:
                self.archMaterialType = 'archMat2Der'

    # clear all fields following <field> by setting them to '--'
    def clearFieldsAfter(self, field):
        try:
            self._genID = self._genID[:self._indexes[field][0]+self._indexes[field][1]] + (26-self._indexes[field][0]-self._indexes[field][1])*'-'
        except:
            raise KeyError
            
    # zero out all fields following <field> by setting them to 0
    def zeroOutFieldsAfter(self, field):
        try:
            self._genID = self._genID[:self._indexes[field][0]+self._indexes[field][1]] + (26-self._indexes[field][0]-self._indexes[field][1])*'0'
        except:
            raise KeyError

    def padFields(self):
        try:
            genidString = ''
            for c in self._genID:
                if c == '-':
                    genidString += '0'
                else:
                    genidString += c
            self._genID = genidString
        except:
            raise KeyError
      
    # set the origin
    def setOrigin(self, v):
        if v:
            if len(v) == self.structData['colletionType']:
                self._genID = v + self._genID[self._indexes['origin'][0]+self._indexes['origin'][1]:]
        
    def setCaseCode(self, v):
        if v:
            if len(v) == self._indexes['caseCode'][1]:
                self._genID = self._genID[:self._indexes['caseCode'][0]] + v + self._genID[self._indexes['caseCode'][0]+self._indexes['caseCode'][1]:]
        
    def setTissue(self, v):
        if v:
            if len(v) == self._indexes['tissue'][1]:
                self._genID = self._genID[:self._indexes['tissue'][0]] + v + self._genID[self._indexes['tissue'][0]+self._indexes['tissue'][1]:]
    
    # set the being type of the aliquot (e.g., human, xeno)
    def setSampleVector(self, v):
        if v:
            if len(v) == self._indexes['sampleVector'][1]:
                self._genID = self._genID[:self._indexes['sampleVector'][0]] + v + self._genID[self._indexes['sampleVector'][0]+self._indexes['sampleVector'][1]:]
        
    # set the passage of the lineage
    def setSamplePassage(self, v):
        if v:
            if len(v) == self._indexes['samplePassage'][1]:
                self._genID = self._genID[:self._indexes['samplePassage'][0]] + v + self._genID[self._indexes['samplePassage'][0]+self._indexes['samplePassage'][1]:]

    # set the mouse number in the current lineage+passage
    def setMouse(self, v):
        if v:
            if len(v) == self._indexes['mouse'][1]:
                self._genID = self._genID[:self._indexes['mouse'][0]] + v + self._genID[self._indexes['mouse'][0]+self._indexes['mouse'][1]:]

    def setTissueType(self, v):
        if v:
            if len(v) == self._indexes['tissueType'][1]:
                self._genID = self._genID[:self._indexes['tissueType'][0]] + v + self._genID[self._indexes['tissueType'][0]+self._indexes['tissueType'][1]:]

    # set the mouse implant site (e.g., SCR, SCL)
    def setImplantSite(self, v):
        if v:
            if len(v) == self._indexes['implantSite'][1]:
                self._genID = self._genID[:self._indexes['implantSite'][0]] + t + self._genID[self._indexes['implantSite'][0]+self._indexes['implantSite'][1]:]
    
    # set the type of the archived material (e.g., 00 for human, VT, SF)
    # use clearFieldsAfter('tissueType') before calling this
    def setArchivedMaterial(self, v):
        if v:
            if len(v) == self._indexes['archMatOrigin'][1]:
                self._genID = self._genID[:self._indexes['archMatOrigin'][0]] + v + self._genID[self._indexes['archMatOrigin'][0]+self._indexes['archMatOrigin'][1]:]
                self.archMaterialType = 'archMatOrigin'
            elif len(v) == self._indexes['archMatDer'][1]:
                self._genID = self._genID[:self._indexes['archMatDer'][0]] + v + self._genID[self._indexes['archMatDer'][0]+self._indexes['archMatDer'][1]:]
                self.archMaterialType = 'archMatDer'
            elif len(v) == 3:
                self._genID = self._genID[:self._indexes['archMatDer'][0]] + v[0] + self._genID[self._indexes['archMatDer'][0]+self._indexes['archMatDer'][1]:]
                self._genID = self._genID[:self._indexes['aliq2Der'][0]] + v[2] + self._genID[self._indexes['aliq2Der'][0]+self._indexes['aliq2Der'][1]:]
                self.archMaterialType = 'archMat2Der'
        
    
    # set the number of the aliquot extraction
    def setAliquotExtraction (self, v):
        if v:
            archType = self._getArchMat()
            if archType:
                if archType == 'archMatOrigin':
                    self._genID = self._genID[:self._indexes['aliqOrigCounter'][0]] + "%02d" % v + self._genID[self._indexes['aliqOrigCounter'][0]+self._indexes['aliqOrigCounter'][1]:]
                elif archType == 'archMatDer':
                    self._genID = self._genID[:self._indexes['aliqDerCounter'][0]] + "%02d" % v + self._genID[self._indexes['aliqDerCounter'][0]+self._indexes['aliqDerCounter'][1]:]
                elif archType == 'archMat2Der':
                    self._genID = self._genID[:self._indexes['aliq2DerCounter'][0]] + "%02d" % v + self._genID[self._indexes['aliq2DerCounter'][0]+self._indexes['aliq2DerCounter'][1]:]


    # tell if genealogy id represents a xenopatient TODO call graph
    def isMouse(self):
        if self.getSampleVectorValid():
            graph = py2neo.database.Graph(settings.GRAPH_DB_URL)
            query = "MATCH (e:Biomouse) where c.identifier=~'"+ self.regex() +"' return c.identifier"
            print (query)
            r = graph.run(query).data()
            if (len(r) == 0):
                return False
            else:
                return True
        return False
        
    def isAliquot(self):
        if self.getSampleVectorValid():
            graph = py2neo.database.Graph(settings.GRAPH_DB_URL)
            query = "MATCH (e:Aliquot) where c.identifier=~'"+ self.regex() +"' return c.identifier"
            print (query)
            r = graph.run(query).data()
            if (len(r) == 0):
                return False
            else:
                return True
        return False


    # get Origin of the tumor (e.g., CRC, BRC)
    def getOrigin(self):
        return self._genID[self._indexes['origin'][0]:self._indexes['origin'][0]+self._indexes['origin'][1]]

    # get the code of the case related to the origin
    def getCaseCode(self):
        return self._genID[self._indexes['caseCode'][0]:self._indexes['caseCode'][0]+self._indexes['caseCode'][1]]

    # concatenate the origin and the case code (e.g., CRC0001)
    def getCase(self):
        return self.getOrigin() + self.getCaseCode()

    # get the tissue of the origin
    def getTissue(self):
        return self._genID[self._indexes['tissue'][0]:self._indexes['tissue'][0]+self._indexes['tissue'][1]]
    
    def getTissueValid(self):
        v = self._genID[self._indexes['tissue'][0]:self._indexes['tissue'][0]+self._indexes['tissue'][1]]
        if v == '-'*self._indexes['tissue'][1]:
            return None
        else:
            return v

    # get the being type of the aliquot (e.g., human, xeno)
    def getSampleVector(self):
        return self._genID[self._indexes['sampleVector'][0]:self._indexes['sampleVector'][0]+self._indexes['sampleVector'][1]]
    
    def getSampleVectorValid(self):
        v = self._genID[self._indexes['sampleVector'][0]:self._indexes['sampleVector'][0]+self._indexes['sampleVector'][1]]
        if v == ('-'*self._indexes['sampleVector'][1]):
            return None
        else:
            return v

    # get the lineage (e.g., 0A, 0B)
    def getLineage(self):
        return self._genID[self._indexes['lineage'][0]:self._indexes['lineage'][0]+self._indexes['lineage'][1]]

    # get the passage of the lineage
    def getSamplePassage(self):
        return self._genID[self._indexes['samplePassage'][0]:self._indexes['samplePassage'][0]+self._indexes['samplePassage'][1]]

    # get the mouse in the lineage+passage
    def getMouse(self):
        return self._genID[self._indexes['mouse'][0]:self._indexes['mouse'][0]+self._indexes['mouse'][1]]

    # concatenate the being, the lineage and the passage
    def getGeneration(self):
        return self.getSampleVector() + self.getLineage() + self.getSamplePassage()

    # get the tissue type of the aliquot (e.g., TUM, LNG)
    def getTissueType(self):
        return self._genID[self._indexes['tissueType'][0]:self._indexes['tissueType'][0]+self._indexes['tissueType'][1]]
    
    def getTissueTypeValid(self):
        v = self._genID[self._indexes['tissueType'][0]:self._indexes['tissueType'][0]+self._indexes['tissueType'][1]]
        if v == ('-'*self._indexes['tissueType'][1]):
            return None
        else:
            return v

    # get the mouse implant site (e.g., SCR, SCL)
    def getImplantSite(self):
        return self._genID[self._indexes['implantSite'][0]:self._indexes['implantSite'][0]+self._indexes['implantSite'][1]]
    
    
    # get the type of the archived material (e.g., 00 for human, VT, SF)
    def getArchivedMaterial(self):
        archType = self._getArchMat()
        if archType == 'archMatOrigin':
            return self._genID[self._indexes['archMatOrigin'][0]:self._indexes['archMatOrigin'][0]+self._indexes['archMatOrigin'][1]]
        elif archType == 'archMatDer':
            return self._genID[self._indexes['archMatDer'][0]:self._indexes['archMatDer'][0]+self._indexes['archMatDer'][1]]
        elif archType == 'archMat2Der':
            return self._genID[self._indexes['archMatDer'][0]:self._indexes['archMatDer'][0]+self._indexes['archMatDer'][1]] + '-' + self._genID[self._indexes['aliq2Der'][0]:self._indexes['aliq2Der'][1]]
        return None
            

    def getAliquotCounter(self):
        archType = self._getArchMat()
        if archType == 'archMatOrigin':
            return self._genID[self._indexes['aliqOrigCounter'][0]:self._indexes['aliqOrigCounter'][0]+self._indexes['aliqOrigCounter'][1]]
        elif archType == 'archMatDer':
            return self._genID[self._indexes['aliqDerCounter'][0]:self._indexes['aliqDerCounter'][0]+self._indexes['aliqDerCounter'][1]]
        elif archType == 'archMat2Der':
            return self._genID[self._indexes['aliq2DerCounter'][0]:self._indexes['aliq2DerCounter'][0]+self._indexes['aliq2DerCounter'][1]]
        return None

    # return the genealogyID
    def getGenID(self):
        return self._genID
   
    #update genealogyID according to the data dictionary
    def updateGenID (self, data):
        tempGenID = self._genID
        for k, v in list(data.items()):
            if k in self._indexes:
                if len(v) == self._indexes[k][1]:
                    tempGenID = tempGenID[:self._indexes[k][0]] + v + tempGenID[self._indexes[k][0]+self._indexes[k][1]:]
                else:
                    return
        self._genID = tempGenID
        return

    #compare parts of Genealogy IDs             
    def compareGenIDs(self, other):
        atypevoid=""
        if self._materialLen:
            atypevoid="--"
        else:
            atypevoid="-"
       
        if((self.getOrigin()=="---" or other.getOrigin()==self.getOrigin())and(self.getCaseCode()=="----" or self.getCaseCode()==other.getCaseCode())and(self.getTissue()=="--" or self.getTissue()==other.getTissue())and(self.getSampleVector()=="-" or self.getSampleVector()==other.getSampleVector())and(self.getLineage()=="--" or other.getLineage()==self.getLineage())and(self.getSamplePassage()=="--" or self.getSamplePassage()==other.getSamplePassage())and(self.getMouse()=="---" or self.getMouse()==other.getMouse())and(self.getTissueType()=="---" or self.getTissueType()==other.getTissueType())and(self.getArchivedMaterial()==atypevoid or self.getArchivedMaterial()==other.getArchivedMaterial())and(self.getAliquotExtraction()=="--" or self.getAliquotExtraction()==other.getAliquotExtraction())and(self.getaliq2Der()=="-" or self.getaliq2Der()==other.getaliq2Der())and(self.getaliq2DerCounter()=="--" or self.getaliq2DerCounter()==other.getaliq2DerCounter())):
            return True
        else:
            return False

    def _counterGenerator(self, size=4, chars=string.ascii_uppercase):
        return ''.join(random.choice(chars) for x in range(size))


    # generate the new genid and lock it in the graph

    def regex(self):
        try:
            genidString = ''
            for c in self._genID:
                if c == '-':
                    genidString += '.'
                else:
                    genidString += c
            return genidString
        except:
            raise KeyError


    def lock(self, data):
        try:
            graph = py2neo.database.Graph(settings.GRAPH_DB_URL)
            nodeLabels = ["Unknown"]
            if 'type' in data:
                if data['type'] == 'Collection':
                    if data['random']:
                        valid = False
                        while not valid:
                            counter = self._counterGenerator()
                            self.setCaseCode(counter)
                            query = "MATCH (c:Collection) where c.identifier=~'"+ self.regex() +"' return c.identifier"
                            print (query)
                            r = graph.run(query).data()
                            if (len(r) == 0):
                                valid = True
                    else:
                        maxCounter, currentCounter = 0, 0
                        query = "MATCH (c:Collection) where c.identifier=~'"+ self.regex() +"' return c.identifier as identifier"
                        print (query)
                        r = graph.run(query).data()
                        for coll in r:
                            print (coll)
                            collGenid = GenealogyID(coll['identifier'])
                            idCase = collGenid.getCaseCode()
                            if idCase.isdigit():
                                print ('idCase digit ', idCase)
                                currentCounter = int(idCase)
                                if currentCounter > maxCounter:
                                    maxCounter = currentCounter
                        currentCounter = str(maxCounter+1).zfill(4)
                        self.setCaseCode(currentCounter)
                    nodeLabels = ["Collection", "Genid"]
                if data['type'] == 'Genid':
                    nodeLabels = ["Genid"]
                if data['type'] == 'Aliquot':
                    nodeLabels = ["Bioentity", "Aliquot", data['material']]
                    maxCounter, currentCounter = 0, 0
                    query = "MATCH (c:" + data['material'] + ") where c.identifier=~'"+ self.regex() +"' return c.identifier as identifier"
                    print (query)
                    r = graph.run(query).data()
                    for entity in r:
                        print (coll)
                        entityGenid = GenealogyID(entity['identifier'])
                        entityGenid.defineArchMaterial( data['material'])
                        alCounter = entityGenid.getAliquotCounter()
                        if alCounter.isdigit():
                            print ('alCounter digit ', alCounter)
                            currentCounter = int(alCounter)
                            if currentCounter > maxCounter:
                                maxCounter = currentCounter
                    currentCounter = str(maxCounter+1).zfill(4)
                    self.setAliquotCounter(currentCounter)

                if data['type'] == 'Biomouse':
                    nodeLabels = ["Bioentity", "Biomouse"]
                    maxCounter, currentCounter = 0, 0
                    query = "MATCH (c:Biomouse) where c.identifier=~'"+ self.regex() +"' return c.identifier as identifier"
                    print (query)
                    r = graph.run(query).data()
                    for entity in r:
                        print (coll)
                        entityGenid = GenealogyID(entity['identifier'])
                        mouseCounter = entityGenid.getMouse()
                        if mouseCounter.isdigit():
                            print ('alCounter digit ', mouseCounter)
                            currentCounter = int(mouseCounter)
                            if currentCounter > maxCounter:
                                maxCounter = currentCounter
                    currentCounter = str(maxCounter+1).zfill(4)
                    self.setMouse(currentCounter)

                if data['type'] == 'Cellline':
                    nodeLabels = ["Bioentity", "Cellline"]
                    maxCounter, currentCounter = 0, 0
                    query = "MATCH (c:Cellline) where c.identifier=~'"+ self.regex() +"' return c.identifier as identifier"
                    print (query)
                    r = graph.run(query).data()
                    for entity in r:
                        print (coll)
                        entityGenid = GenealogyID(entity['identifier'])
                        cellCounter = entityGenid.getMouse() # to verify which is the correct field
                        if cellCounter.isdigit():
                            print ('alCounter digit ', cellCounter)
                            currentCounter = int(cellCounter)
                            if currentCounter > maxCounter:
                                maxCounter = currentCounter
                    currentCounter = str(maxCounter+1).zfill(4)
                    self.setMouse(currentCounter)
                
                    
            else:
                raise Exception ('no node type in the request')

            self.padFields()
            tx = graph.begin()
            node = py2neo.Node(nodeLabels[0], identifier=self.getGenID(), temp=True, timestamp=str(datetime.datetime.now()))
            for l in nodeLabels[1:]:
                node.add_label(l)
            tx.create(node)
            tx.commit()
        except Exception as e:
            print (e)
            return False
        return True

    def unlock(self):
        try:
            graph = py2neo.database.Graph(settings.GRAPH_DB_URL)
            query = "MATCH (c) where c.identifier=~'"+ self.regex() +"' return c"
            res = graph.run(query)
            tx = graph.begin()
            for r in res:
                node = r.to_subgraph()
                del node['temp']
                del node['timestamp']
                tx.push(node)
            tx.commit()
        except Exception as e:
            print (e)
            return False
        return True


class GetIdentifier(APIView):
    authentication_classes = ()
    def post(self, request):
        try:
            print (request.data['info'], request.data['action'])
            g = GenealogyID()
            g.updateGenID(request.data['info'])
            locked = g.lock(request.data['action'])
            if locked:
                return Response({'identifier': g.getGenID()})
            else:
                return Response(status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print (e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

