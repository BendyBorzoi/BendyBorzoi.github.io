let nav = document.getElementById('nav');
xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState === 4) {
        nav.innerHTML = this.responseText;
    }
};
xhttp.open("GET", 'nav.html', true);
xhttp.send();