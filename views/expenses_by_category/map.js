function(doc){
   if (doc.type && doc.type == "expense"){
      emit([ doc.date[0], doc.date[1], doc.category],  doc.amount);
   }
}

