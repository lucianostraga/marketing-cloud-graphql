<script runat="server">
Platform.Load("Core","1");
try{    

    var contentType = 'application/x-www-form-urlencoded'; 
    var authUrl = 'https://MY_SALESFORCE_DOMAIN/services/oauth2/token';
    var payload = 'grant_type=client_credentials&client_id=APP_CLIENT_ID&client_secret=APP_CLIENT_SECRET';
  
    var authReq = HTTP.Post(authUrl, contentType, payload);
 
    var accessToken = Platform.Function.ParseJSON(authReq.Response[0]).access_token;
  
    Write("<TOKEN:> " + accessToken)
  
    var requestBodyQuery = {
      "query": "query contactsQuery { uiapi { query { Contact( where: { and : [ { or: [ {Title: { like : \"C%\" }}, {Title: { like : \"VP%\" }} {Title: { like : \"Director%\" }} ] }, { Id: { inq: { Case: {}, ApiName:\"ContactId\" }, } AccountId: { inq: { Opportunity: { Amount: { gt : 100000 } }, ApiName:\"AccountId\" }, } } ] } first:2000 upperBound: 500000) { edges { node { Id FirstName { value } LastName { value } Account { Name { value } } Email { value } Title { value } } } totalCount pageInfo { endCursor hasNextPage hasPreviousPage } } } }}"
    }
      
    var headerNames = ["Authorization"];
    var headerValues = ["Bearer " + accessToken];
    var serviceContentType = 'application/json; charset=UTF-8'; 

    var serviceUrl = 'https://teaminternational-dev-ed.develop.my.salesforce.com/services/data/v59.0/graphql';

    var graphqlReq = HTTP.Post(serviceUrl, serviceContentType, Stringify(requestBodyQuery), headerNames, headerValues);
  
    var graphqlResponse = Platform.Function.ParseJSON(graphqlReq.Response[0]);
  
    var de = DataExtension.Init("DATA_EXTENSION_KEY");
  
    var newRows = [];
  
    for (var i = 0; i < graphqlResponse.data.uiapi.query.Contact.edges.length; i++) {
      var node = graphqlResponse.data.uiapi.query.Contact.edges[i].node;
      
      var existingRow = de.Rows.Lookup(["Id"], [node.Id]);
      
      if(existingRow == null){//INSERT
        var row = {
          Id : node.Id,
          FirstName : node.FirstName.value,
          LastName : node.LastName.value,
          Company : node.Account.Name.value,
          Title : node.Title.value,
          Email : node.Email.value
        };
                
        newRows.push(row);
      
      }else{//UPDATE
        
        var row = {
          FirstName : node.FirstName.value,
          LastName : node.LastName.value,
          Company : node.Account.Name.value,
          Title : node.Title.value,
          Email : node.Email.value
        };
        
        de.Rows.Update(row, ['ID'], [node.Id]);
      }
    }
  
    de.Rows.Add(newRows);
  
    var isoTime = Platform.Function.TreatAsContent("\%\%=FormatDate(Now(),'iso')=\%\%");
  
    var queryUpdateString = 'mutation contactsUpdate{ uiapi {';
 
    for (var i = 0; i < graphqlResponse.data.uiapi.query.Contact.edges.length; i++){
       var node = graphqlResponse.data.uiapi.query.Contact.edges[i].node;
       queryUpdateString += ' request'+i+' : ContactUpdate(input: { Contact: { Last_MC_Sync__c: "'+isoTime+'" } Id: "'+node.Id+'" }) { success } ';
    }

    queryUpdateString += '}}';
  
    var requestBodyUpdate = {
      "query": queryUpdateString
    }
        
    var graphqlReq = HTTP.Post(serviceUrl, serviceContentType, Stringify(requestBodyUpdate), headerNames, headerValues);
  
} catch (e) {
  Write("<br>" + Stringify(e))
}
</script>