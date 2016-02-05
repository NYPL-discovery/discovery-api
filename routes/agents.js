module.exports = function(app){



	app.all('*', function(req, res, next) {
	  res.header('Access-Control-Allow-Origin', '*');
	  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
	  res.header('Access-Control-Allow-Headers', 'Content-Type');
	  next();
	});



    app.get('/api/agents', function(req, res){


    	if (req.query.action){

    		if (!req.query.value && ['random'].indexOf(req.query.action.toLowerCase()) == -1){
				res.type('application/json')
				res.status(500).send(JSON.stringify({error: "No Value supplied"}, null, 2))
				return
    		}

    		if (req.query.action.toLowerCase() == 'search'){

					app.agents.findById(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}
    		if (req.query.action.toLowerCase() == 'searchbyname'){

					app.agents.searchByName(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}

    		if (req.query.action.toLowerCase() == 'overview'){

					app.agents.overview(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}
    		if (req.query.action.toLowerCase() == 'resourcereport'){

					app.agents.reportResourceType(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}
    		if (req.query.action.toLowerCase() == 'imagesof'){

					app.agents.imagesOf(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}
    		if (req.query.action.toLowerCase() == 'resources'){

					app.agents.resources(req.query.value, function(agent){    	
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agent, null, 2))
			    		return true
			    	})

			}

    		if (req.query.action.toLowerCase() == 'random'){

					app.agents.randomAgents(function(agents){   
						res.type('application/json')
			    		res.status(200).send(JSON.stringify(agents, null, 2))
			    		return true
			    	})

			}


		}else{

			res.type('application/json')
			res.status(500).send(JSON.stringify({error: "No Action requested"}, null, 2))



		}




    })

    //other routes..
}