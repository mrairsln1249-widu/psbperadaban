document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Navbar scroll state ---------- */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- Mobile menu toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open);
  });

  document.querySelectorAll('.nav__links a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', false);
    });
  });

  /* ---------- Countdown timer ---------- */
  const targetDate = new Date('2027-07-17T23:59:59+07:00');

  const closeDateEl = document.getElementById('close-date');
  if (closeDateEl) {
    closeDateEl.textContent = targetDate.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  const pad = n => String(n).padStart(2, '0');
  const els = {
    d: document.getElementById('cd-d'),
    h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'),
    s: document.getElementById('cd-s'),
  };

  function tick() {
    if(!els.d) return;
    const diff = Math.max(0, targetDate - new Date());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000) % 24;
    const mins = Math.floor(diff / 60000) % 60;
    const secs = Math.floor(diff / 1000) % 60;

    els.d.textContent = pad(days);
    els.h.textContent = pad(hours);
    els.m.textContent = pad(mins);
    els.s.textContent = pad(secs);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Scroll to Top Button ---------- */
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('is-visible');
    } else {
      scrollTopBtn.classList.remove('is-visible');
    }
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- Reveal on scroll (Termasuk Timeline) ---------- */
  const revealEls = document.querySelectorAll('.reveal, .timeline-item');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ============================================================
     REGISTRATION API
     ============================================================ */
  const registrationForm = document.getElementById('registrationForm');
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const status = document.getElementById('registrationStatus');
      const originalText = btn.innerHTML;

      btn.innerHTML = 'Menyimpan data...';
      btn.disabled = true;
      btn.style.opacity = '0.7';
      status.textContent = '';
      status.className = 'form-status';

      try {
        const response = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Pendaftaran gagal disimpan.');

        status.className = 'form-status is-success';
        status.textContent = `Pendaftaran berhasil. Nomor pendaftaran Anda: ${result.registration.id}`;
        e.target.reset();
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Server tidak dapat dihubungi. Silakan coba lagi.';
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }

  /* ============================================================
     CHATBOT LOGIC
     ============================================================ */
  const chatWidget = document.getElementById('chatWidget');
  const fabChat = document.getElementById('fabChat');
  const closeChat = document.getElementById('closeChat');
  const chatBody = document.getElementById('chatBody');
  const chatSuggestions = document.getElementById('chatSuggestions');
  const waNumber = '6285210738001';
  let messageIdCounter = 0;

  if (fabChat && closeChat) {
    fabChat.addEventListener('click', () => chatWidget.classList.add('is-open'));
    closeChat.addEventListener('click', () => chatWidget.classList.remove('is-open'));
  }

  const mainMenuOptions = [
    { id: 'biaya', text: 'Informasi Biaya Pendaftaran' },
    { id: 'syarat', text: 'Syarat & Berkas yang Dibutuhkan' },
    { id: 'alur', text: 'Alur Pendaftaran Santri' },
    { id: 'program', text: 'Program & Fasilitas Pesantren' },
    { id: 'wa', text: 'Tanya Admin via WhatsApp', isWA: true }
  ];

  const faqAnswers = {
    biaya: {
      answer: 'Pendaftaran formulir dan administrasi awal <b>100% gratis</b>.<br><br>Biaya pendidikan menggunakan sistem subsidi silang: SMA SPP Rp 600.000 / Rp 350.000 / Rp 150.000 per bulan; SMP SPP Rp 450.000 / Rp 300.000 / Rp 100.000 per bulan sesuai golongan.<br><br>Wakaf Sarpras dibayarkan satu kali dan tersedia dukungan beasiswa.',
      followUps: [
        { id: 'beasiswa', text: 'Apa saja jenis beasiswa?' },
        { id: 'pembayaran', text: 'Bagaimana cara pembayarannya?' }
      ]
    },
    syarat: {
      answer: 'Dokumen umum:<br>1. Bukti daftar online<br>2. Pas foto terbaru latar merah ukuran 4x6<br>3. Akta kelahiran<br>4. KK terbaru ber-barcode<br>5. Surat pernyataan orang tua/wali<br>6. Slip gaji atau surat keterangan penghasilan.<br><br>Rapor, ijazah, surat berkelakuan baik, KIP/PKH/KKS, dan sertifikat prestasi disiapkan sesuai kebutuhan.',
      followUps: [
        { id: 'unggah', text: 'Bagaimana cara mengunggah berkas?' },
        { id: 'alur', text: 'Lihat alur pendaftaran' }
      ]
    },
    alur: {
      answer: 'Alur pendaftaran:<br>1. Isi formulir online atau datang ke sekretariat<br>2. Pendaftaran gratis<br>3. Serahkan bukti daftar dan berkas<br>4. Ikuti tes akademik dasar, BTQ, dan wawancara<br>5. Ikuti observasi orang tua/wali<br>6. Cek pengumuman resmi di website.',
      followUps: [
        { id: 'tes', text: 'Apa saja materi tes seleksi?' },
        { id: 'status', text: 'Bagaimana memantau status pendaftaran?' }
      ]
    },
    program: {
      answer: "Program tersedia: SMP, SMA (Boarding), dan Kesetaraan Paket C. Keunggulan meliputi Kurikulum Merdeka, kurikulum pesantren, Tahfidz Al-Qur'an, project-based learning, riset sains, magang, dan smart school.<br><br>Fasilitas meliputi asrama putra-putri, kelas modern, perpustakaan, laboratorium, olahraga, klinik/UKS, kantin, internet, dan Guest House.",
      followUps: [
        { id: 'asrama', text: 'Apakah santri wajib tinggal di asrama?' },
        { id: 'jenjang', text: 'Jenjang apa saja yang tersedia?' }
      ]
    },
    beasiswa: {
      answer: 'Tersedia Program Indonesia Pintar (KEMDIKBUD) dan KIP Kuliah, Beasiswa Perintis, Beasiswa BAZNAS, serta beasiswa yayasan dan donatur atau pihak ketiga. Hubungi panitia untuk ketentuan masing-masing program.',
      followUps: [{ id: 'syarat_beasiswa', text: 'Apa syarat beasiswa?' }]
    },
    pembayaran: {
      answer: 'Pendaftaran formulir dan administrasi awal gratis. Rincian biaya pendidikan ditetapkan berdasarkan golongan subsidi silang setelah dokumen penghasilan diverifikasi. Jika dokumen tidak dilampirkan, sistem menetapkan Golongan 1.',
      followUps: [{ id: 'alur', text: 'Lihat alur pendaftaran' }]
    },
    unggah: {
      answer: 'Berkas diunggah setelah formulir pendaftaran dikirim. Pastikan dokumen terbaca jelas dan gunakan format JPG, PNG, atau PDF sesuai petunjuk.',
      followUps: [{ id: 'syarat', text: 'Lihat daftar berkas yang dibutuhkan' }]
    },
    tes: {
      answer: 'Tes seleksi dapat berlangsung offline atau online, meliputi akademik dasar (Matematika dan umum), Baca Tulis Al-Qur’an (BTQ), dan wawancara kepribadian. Orang tua/wali mengikuti observasi atau wawancara tersendiri.',
      followUps: [{ id: 'status', text: 'Bagaimana memantau status pendaftaran?' }]
    },
    status: {
      answer: 'Status pendaftaran dapat dipantau menggunakan nomor pendaftaran. Pembaruan status juga disampaikan melalui WhatsApp dan email wali.',
      followUps: [{ id: 'wa', text: 'Tanya admin melalui WhatsApp', isWA: true }]
    },
    asrama: {
      answer: 'Ya, <b>semua santri wajib tinggal di lingkungan pesantren</b> selama mengikuti pendidikan. Ketentuan ini mendukung pembinaan adab, kemandirian, tahfidz, dan kegiatan belajar santri. Pesantren menyediakan asrama putra dan putri beserta ruang belajar, sarana olahraga, klinik/UKS, kantin, dapur umum, dan internet.',
      followUps: [{ id: 'program', text: 'Lihat program dan fasilitas' }]
    },
    jenjang: {
      answer: 'Tersedia jenjang <b>SMP</b>, <b>SMA (Boarding)</b>, dan <b>Kesetaraan Paket C</b>. SMP diperuntukkan bagi lulusan SD/MI, sedangkan SMA bagi lulusan SMP/MTs.',
      followUps: [{ id: 'syarat', text: 'Lihat syarat pendaftaran' }]
    },
    syarat_beasiswa: {
      answer: 'Syarat beasiswa menyesuaikan jenisnya, seperti bukti prestasi, sertifikat tahfiz, atau dokumen kondisi ekonomi keluarga. Hubungi panitia untuk verifikasi.',
      followUps: [{ id: 'wa', text: 'Tanya admin melalui WhatsApp', isWA: true }]
    }
  };

  window.renderMenu = function(menuArray) {
    chatSuggestions.innerHTML = '';
    menuArray.forEach(opt => {
      const btn = document.createElement('button');
      if (opt.isWA) {
        btn.className = 'btn-wa';
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          ${opt.text}
        `;
        btn.onclick = () => redirectToWA('Saya ingin bertanya lebih lanjut seputar PSB.');
      } else {
        btn.innerHTML = `
          ${opt.text}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        btn.onclick = () => handleQuestion(opt.id, opt.text);
      }
      chatSuggestions.appendChild(btn);
    });
    chatSuggestions.style.display = 'flex';
  }

  function renderLegacyFollowUp() {
    chatSuggestions.innerHTML = `
      <button onclick="renderMenu(mainMenuOptions)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Kembali ke Menu Utama
      </button>
      <button class="btn-wa" onclick="redirectToWA('Saya sudah membaca informasi singkat, namun ingin bertanya lebih lanjut.')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
        Tanya Lebih Lanjut via WA
      </button>
    `;
  }

  function renderFollowUp(followUps = []) {
    chatSuggestions.innerHTML = '';
    const options = [
      ...followUps,
      { id: 'menu', text: 'Kembali ke Menu Utama' },
      { id: 'wa', text: 'Tanya admin melalui WhatsApp', isWA: true }
    ];

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = opt.isWA ? 'btn-wa' : '';
      btn.textContent = opt.text;
      btn.onclick = () => {
        if (opt.isWA) {
          redirectToWA('Saya ingin bertanya lebih lanjut seputar PSB.');
        } else if (opt.id === 'menu') {
          renderMenu(mainMenuOptions);
        } else {
          handleQuestion(opt.id, opt.text);
        }
      };
      chatSuggestions.appendChild(btn);
    });
    chatSuggestions.style.display = 'flex';
  }

  const unknownQuestionAnswer = 'Maaf, informasi untuk pertanyaan tersebut belum tersedia di sistem. Untuk informasi lebih lanjut, silakan hubungi admin melalui WhatsApp.';
  function getLocalAnswer(message) {
    const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();
    const islamicGreetingKeywords = ['assalamualaikum', 'assalamu alaikum', 'assalamu’alaikum'];
    const timeGreetingKeywords = ['selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam'];
    const casualGreetingKeywords = ['halo', 'hai', 'hi'];
    const intentKeywords = [
      { id: 'biaya', keywords: ['biaya', 'spp', 'wakaf', 'infaq beras', 'uang sekolah'] },
      { id: 'syarat', keywords: ['syarat', 'dokumen', 'berkas', 'rapor', 'akta', 'kartu keluarga', 'kk'] },
      { id: 'alur', keywords: ['alur', 'cara daftar', 'cara mendaftar', 'pendaftaran'] },
      { id: 'program', keywords: ['program', 'fasilitas', 'paket c', 'jenjang'] },
      { id: 'beasiswa', keywords: ['beasiswa', 'kip', 'baznas'] },
      { id: 'tes', keywords: ['tes', 'ujian', 'asesmen', 'seleksi'] },
      { id: 'status', keywords: ['status pendaftaran', 'hasil seleksi', 'pengumuman'] }
    ];

    if (islamicGreetingKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return {
        answer: 'Wa’alaikumussalam warahmatullahi wabarakatuh. Selamat datang di layanan informasi PSB Pesantren Peradaban. Ada yang ingin Anda tanyakan?',
        followUps: mainMenuOptions
      };
    }

    if (timeGreetingKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      const greeting = timeGreetingKeywords.find(keyword => normalizedMessage.includes(keyword));
      return {
        answer: `Assalamu’alaikum warahmatullahi wabarakatuh.<br><br>${greeting.charAt(0).toUpperCase()}${greeting.slice(1)}. Selamat datang di layanan informasi PSB Pesantren Peradaban. Ada yang ingin Anda tanyakan?`,
        followUps: mainMenuOptions
      };
    }

    if (casualGreetingKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return {
        answer: 'Assalamu’alaikum warahmatullahi wabarakatuh. Selamat datang di layanan informasi PSB Pesantren Peradaban. Ada yang ingin Anda tanyakan?',
        followUps: mainMenuOptions
      };
    }

    const boardingKeywords = [
      'asrama',
      'berasrama',
      'mondok',
      'tinggal di pesantren',
      'tinggal dipesantren',
      'tinggal di lingkungan pesantren',
      'wajib tinggal'
    ];

    if (boardingKeywords.some(keyword => normalizedMessage.includes(keyword))) {
      return faqAnswers.asrama;
    }

    const matchedIntent = intentKeywords.find(intent =>
      intent.keywords.some(keyword => normalizedMessage.includes(keyword))
    );
    if (matchedIntent) {
      return faqAnswers[matchedIntent.id];
    }

    return null;
  }

  async function requestChatbot(message) {
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error('Respons chatbot tidak valid.');
    }

    if (!response.ok) {
      throw new Error(result.message || 'Chatbot sedang tidak tersedia.');
    }

    return result;
  }

  function showUnknownAnswer() {
    appendMessage(unknownQuestionAnswer, 'bot');
    renderFollowUp();
  }

  function handleQuestion(id, questionText) {
    chatSuggestions.style.display = 'none';
    appendMessage(questionText, 'user');

    if (faqAnswers[id]) {
      appendMessage(faqAnswers[id].answer, 'bot');
      renderFollowUp(faqAnswers[id].followUps);
      return;
    }

    const localAnswer = getLocalAnswer(questionText);
    if (localAnswer) {
      appendMessage(localAnswer.answer, 'bot');
      renderFollowUp(localAnswer.followUps);
      return;
    }

    requestChatbot(`${id} ${questionText}`)
      .then(result => {
        appendMessage(result.answer, 'bot');
        renderFollowUp();
      })
      .catch(() => showUnknownAnswer());
  }

  function appendMessage(text, sender) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `chat-message-wrapper ${sender === 'user' ? 'user-wrap' : ''}`;
    
    const msgId = `msg-${++messageIdCounter}`;
    msgWrapper.setAttribute('data-message-id', msgId);

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    msgDiv.innerHTML = text;
    
    msgWrapper.appendChild(msgDiv);

    if (sender === 'bot') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'chat-actions';
      actionsDiv.innerHTML = `
        <button class="chat-action-btn" onclick="handleFeedback('${msgId}', 'like', this)" aria-label="Suka">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
        </button>
        <button class="chat-action-btn" onclick="handleFeedback('${msgId}', 'dislike', this)" aria-label="Tidak Suka">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
        </button>
        <button class="chat-action-btn" onclick="copyToClipboard(this)" aria-label="Salin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      `;
      msgWrapper.appendChild(actionsDiv);
    }

    chatBody.insertBefore(msgWrapper, chatSuggestions);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  window.handleFeedback = function(msgId, type, btn) {
    const actionContainer = btn.parentElement;
    const likeBtn = actionContainer.querySelectorAll('.chat-action-btn')[0];
    const dislikeBtn = actionContainer.querySelectorAll('.chat-action-btn')[1];
    
    likeBtn.classList.remove('liked');
    dislikeBtn.classList.remove('disliked');

    if (type === 'like') {
      if (btn.classList.contains('liked')) {
        btn.classList.remove('liked');
      } else {
        btn.classList.add('liked');
      }
    } else if (type === 'dislike') {
      if (btn.classList.contains('disliked')) {
        btn.classList.remove('disliked');
      } else {
        btn.classList.add('disliked');
      }
    }

    fetch('/api/chatbot/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msgId, feedback: type })
    }).catch(error => console.error('Gagal mengirim feedback:', error));
  }

  window.copyToClipboard = function(btn) {
    const wrapper = btn.closest('.chat-message-wrapper');
    const textToCopy = wrapper.querySelector('.chat-message').innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      btn.classList.add('copied');
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Gagal menyalin teks: ', err);
    });
  }

  window.redirectToWA = function(message) {
    const text = encodeURIComponent(message + "\n\n(Dikirim dari website www.pesantrenperadaban.my.id)");
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  }

  window.handleKeyPress = function(e) {
    if (e.key === 'Enter') window.sendToWA();
  }

  window.sendToWA = function() {
    const input = document.getElementById('chatInput');
    const val = input.value.trim();
    if (val !== '') {
      chatSuggestions.style.display = 'none';
      appendMessage(val, 'user');
      input.value = '';
      const localAnswer = getLocalAnswer(val);
      if (localAnswer) {
        appendMessage(localAnswer.answer, 'bot');
        renderFollowUp(localAnswer.followUps);
        return;
      }

      requestChatbot(val)
        .then(result => {
          appendMessage(result.answer, 'bot');
          renderFollowUp();
        })
        .catch(() => showUnknownAnswer());
    }
  }

  // Panggil render menu saat pertama kali load
  if (chatSuggestions) {
    window.renderMenu(mainMenuOptions);
  }

});