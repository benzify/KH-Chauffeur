const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-button');
menu.addEventListener('click',()=>{const open=header.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu')});
document.querySelectorAll('.site-header a').forEach(a=>a.addEventListener('click',()=>{header.classList.remove('open');menu.setAttribute('aria-expanded','false')}));

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

const fleets={
  executive:{detail:'A refined saloon for up to three passengers—ideal for airport and business travel.',image:'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=88',tag:'Executive class'},
  suv:{detail:'Elevated comfort and generous luggage space for up to five passengers.',image:'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=88',tag:'Luxury SUV'},
  group:{detail:'Spacious, considered travel for families, delegations and small groups.',image:'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1400&q=88',tag:'Group travel'}
};
const fleetImage=document.querySelector('.fleet-image');
document.querySelectorAll('.fleet-tabs button').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.fleet-tabs button').forEach(b=>b.setAttribute('aria-selected','false'));
  button.setAttribute('aria-selected','true');const data=fleets[button.dataset.fleet];
  document.querySelector('.fleet-detail').textContent=data.detail;fleetImage.style.backgroundImage=`url('${data.image}')`;document.querySelector('.fleet-tag').textContent=data.tag;
}));

document.querySelector('.booking-form').addEventListener('submit',event=>{event.preventDefault();event.currentTarget.querySelector('.form-note').textContent='Thank you — the form experience is ready. Add your real booking email or system to receive requests.'});
document.getElementById('year').textContent=new Date().getFullYear();
