function(doc) {
  if (doc.type && (doc.type == "expense")){
     if (doc.date && doc.category && doc.amount && doc.comment){
       emit( [doc.date, doc.category, doc._id], {amount : doc.amount, comment : doc.comment} );
     }
  }
}

