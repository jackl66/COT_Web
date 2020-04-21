const express = require('express')
const mustacheExpress = require('mustache-express')
const bodyParser = require('body-parser')
const { Client } = require('pg')
require('dotenv').config()

var auth = require('./auth/auth')

const app = express()
const mustache = mustacheExpress()
const client = new Client({
    database: process.env.PGDATABASE,       //your database
    user: process.env.PGUSER,               //your username
    password: process.env.PGPASS,           //your password
    host: "localhost",                      //your host name (name of your machine)
    port: 5432
})

mustache.cache = null;
app.engine('mustache',mustache)
app.set('view engine','mustache')

app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.use('/auth',auth)

connectToClient();

app.listen(process.env.PORT,()=>{
    console.log(`listening on ${process.env.PORT}`)
})

//get the current movie list 
app.get('/search',(req,res)=>{
    client.query('select mid,movies.name,to_char(release_date,\'dd-Mon-yyyy\') as release_date,category,directors.name as dn' +
    ' from movies,directors where movies.director=directors.did order by mid')
    .then((results)=>{
        res.render('search',results);
    })
    .catch((err)=>{
    console.log('err',err)
    res.redirect('/')
    })
})

//search by category
app.post('/search-byca',(req,res)=>{
    client.query('select mid,movies.name,to_char(release_date,\'dd-Mon-yyyy\') as release_date,category,directors.name as dn'+
    ' from movies,directors where category = $1 and movies.director=directors.did order by mid',
    [req.body.category])
    .then((results)=>{  
        res.render('search',results);
       
    })
    .catch((err)=>{
    console.log('err',err)
    res.redirect('/')
    })
})

//search by date
app.post('/search-bydate',(req,res)=>{
    client.query('select mid,movies.name,to_char(release_date,\'dd-Mon-yyyy\') as release_date,category,directors.name as dn '+
    'from movies ,directors where movies.director=directors.did order by release_date desc limit 5 ')
    .then((results)=>{  
        res.render('search',results);
       
    })
    .catch((err)=>{
    console.log('err',err)
    res.redirect('/')
    })
})

//search by director 
app.post('/search-byname',(req,res)=>{
    client.query('select mid,movies.name,to_char(release_date,\'dd-Mon-yyyy\') as release_date,category,directors.name as dn'+
    ' from movies,directors where directors.name = $1 and movies.director=directors.did order by mid',
    [req.body.name])
    .then((results)=>{  
        res.render('search',results);
    })
    .catch((err)=>{
    console.log('err',err)
    res.redirect('/')
    })
})

//redirect to search page where has the original movie list 
app.get('/search-byca',(req,res)=>{
     
    res.redirect('/search')
    
})

app.get('/search-bydate',(req,res)=>{
     
    res.redirect('/search')
    
})

app.get('/search-byname',(req,res)=>{
     
    res.redirect('/search')
    
})

//display the playlist with movie & diector information
app.get('/insert',(req,res)=>{
    client.query('select playlist.uid,playlist.mid,movies.name,to_char(release_date,\'dd-Mon-yyyy\') as release_date ,directors.name,category from' +
    ' movies,playlist,directors where playlist.mid=movies.mid and directors.did=movies.director')
    .then((results)=>{
        console.log('results?',results);
        res.render('insert',results);
    })
    .catch((err)=>{
    console.log('err',err)
    res.redirect('/')
    })
})

//insert into the playlist
app.post('/insert-watch',(req,res)=>{
    client.query('insert into playlist (uid,mid) values($1,$2)',
        [req.body.uid,req.body.mid])
    .then(()=>{
            //console.log('resulut?',result)
            res.redirect('/insert')
    })
    .catch((err)=>{
        console.log('err',err)
        res.redirect('/')
    })

 })

//delete items in the playlist 
app.post('/insert/delete-watch/:uid/:mid',(req,res)=>{
    //console.log("12")
    console.log(req.params.uid,req.params.mid)
    client.query('delete from playlist where uid =$1 and mid= $2',
        [req.params.uid,req.params.mid])
    .then(()=>{
           //console.log('result?',result)
           res.redirect('/insert')
    })
    .catch((err)=>{
       console.log('err',err)
       res.redirect('/')
   })

})

/*
 * Function to connect to client
*/
async function connectToClient() {
    try {   //attempt to connect to client
        await client.connect()
        console.log("successfully connected to client..")
    }
    catch (e) { //catch and log errors
        console.error('could not connect..', e)
    }
}

/*
 * Function to disconnect from client
*/
async function disconnectFromClient() {
    try {
        await client.end()
        console.log("successfully disconnected from client..")
    }
    catch (e) {
        console.error('could not disconnect..', e)
    }
}

/*
 * Login functionalities
 */

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {

});

/*
 * Registration functionalities
 */

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    
});