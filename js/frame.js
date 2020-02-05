if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                  document.body.appendChild = "<a href="https://www.w3schools.com">Visit W3Schools.com!</a>";
                }else{
                  document.body.appendChild = "<iframe src="www.tesis.binhexs.it" height="200" width="300"></iframe>";
                }