function(doc) {
    if (doc.type && (doc.type == "income")
	&& doc.date && doc.category){
	emit([doc.date, doc.category, doc._id], {amount: doc.amount, comment: doc.comment});
    }
}

