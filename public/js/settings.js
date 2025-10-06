// settings.js - additional settings behavior
function loadSettings(){
  const creatorBox = document.getElementById('creatorText');
  if(creatorBox) creatorBox.innerText = 'ساخته شده توسط امیرعلی عمارلو و ChatGPT';
}
window.addEventListener('load', loadSettings);
