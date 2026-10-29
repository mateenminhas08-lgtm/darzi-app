# Darzi Dukaan

Mardon ki silai ki dukaan ke liye mobile-friendly, installable web app. Yeh **working pilot / pehla version** hai, production-hardened hosted service nahi. Shuru mein saara data **sample** hota hai.

## Sab se pehle

1. App kholain. Sample data se buttons aur dashboard check karein.
2. Asli kaam se pehle **Apni dukaan shuru karein** par click karein. Is se sample aur sample par ki gayi changes hat jayengi.
3. Settings mein dukaan ka naam, phone, pata aur daily capacity likh kar save karein.
4. **Customers & Naap** mein customer add karein. Phone number optional hai; ek number se alag profiles ban sakti hain. Customer ke andar ghar ke aur afrad bhi add kar sakte hain.
5. Kisi fard ka **Naap add karein**. Tayyar kapray / jism aur aadha / poora ghera khud choose karein. Text mein `22½` jaise naap, note aur apne custom fields bhi likh sakte hain. Har naya version purane se alag save hota hai.
6. **Naya order** mein customer, har fard ka item, quantity, rate, kapray ki pehchan, design, due date aur advance likhein. Alag delivery date ya alag status ke liye item alag add karein. Ek item par quantity 2 ho to us group ka status ek hi hoga.
7. Order khol kar har item ki status, payment, receipt aur WhatsApp message check karein. WhatsApp message khud-bakhud send nahi hota; user ko confirm/send karna hota hai. Receipt se browser mein Print / Save as PDF kar sakte hain.
8. **Karigar** optional hai. Order item mein karigar aur per-piece mazdoori likhein. Completed mazdoori sirf Tayyar ya Diya gaya items se ginati hai; di hui mazdoori kharchon mein bhi record hoti hai.
9. **Hisaab** aur **Reports** mein wasooli, baqaya, recorded kharchay aur charts dekhein. Net cash = wasooli minus recorded kharchay; yeh munafa nahi hai.

## Mobile aur offline

- Phone par app ka **HTTPS link** browser mein kholain. Android Chrome mein menu → **Install app / Add to Home screen**. iPhone Safari mein Share → **Add to Home Screen**. Menu aur support browser ke mutabiq mukhtalif ho sakti hai.
- Pehli baar app aur uske files internet se load ho kar cache honi chahiye. Us ke baad bunyadi kaam usi browser/device par offline ho sakta hai. Browser ki private mode, storage settings ya site data clear karne se records mit sakte hain.
- Local data browser ki storage mein **unencrypted** hai. Phone ko lock rakhein aur regularly backup banayein. Installed app aur browser ki storage kuch platforms par alag ho sakti hai: install ke baad apna backup aur data check kar lein.
- `localhost` phone ke liye phone khud hota hai, aapka PC nahi. Kisi doosray device se istemal ke liye us device par same **hosted HTTPS URL** kholna hoga.
- Arena ka live preview temporary ho sakta hai. Use permanent hosting ya guaranteed backup na samjhein. Preview URL badalne par browser ka purana local data naye URL par automatically nahi aata.

## Backup aur doosray device par data

**Settings → Backup download karein** se JSON file milegi. Is mein customer details aur naap hotay hain; yeh file encrypted nahi hai, isay private aur safe jagah rakhein. Restore karne se current device ka data replace hota hai; pehle us ka backup banayein. Agar sync on hai, restore ke baad naya data sync ho sakta hai.

### Optional encrypted sync — beta

- Dono devices par **isi app server ka same HTTPS URL** kholain. Pehle device par Settings → **Sync shuru karein**, phir secret key copy karein. Doosray device par Settings → **Maujooda key se judain**. Connect karne par doosray device ka local data replace hota hai: pehle us ka backup banayein.
- App snapshot ko browser mein AES-GCM se encrypt karti hai aur ciphertext isi app server ko bhejti hai. Encryption key sync key ka hissa hai; server ko sirf ciphertext aur alag random access token bheja jata hai. Device ka local data aur downloaded backup encrypted nahi hain.
- Sync key jis ke paas ho use poori dukaan ke data ka access mil sakta hai. Key private rakhein; granular staff permissions ya key recovery nahi hai. Key kho jaye to server copy recover nahi ho sakti.
- Offline changes device par rehti hain. Internet aa jaye aur app khuli ho to sync dobara koshish karti hai. Agar dono devices par alag changes hon to auto-merge ke bajaye **conflict** dikhati hai aur overwrite nahi karti. Pehle local backup banayein, phir zaroorat par server copy load karein.
- App server online rehna aur uska `data/sync.sqlite3` durable rehna zaroori hai. Disconnect karne se server copy delete nahi hoti. Preview ya yeh simple server permanent backup ka substitute nahi. Real deployment ke liye HTTPS, durable storage, access/abuse controls aur regular backups ka intezam aur security review zaroori hai.

## Power BI / Excel

Reports mein **Orders, Items, Payments aur Expenses CSV** download karke Excel ya Microsoft Power BI mein manually import kar sakte hain. Is version mein live Microsoft Power BI integration, Microsoft login ya automatic report refresh nahi hai. Data ki mukammalta aap ki entries par depend karti hai.

## ZIP se apne computer par chalana

ZIP mein bana hua `site/` aur source code dono shamil hain. Python 3.9+ chahiye; basic use ke liye Node ya internet ki zaroorat nahi.

```bash
cd darzi-dukaan
python3 server.py
```

Windows par `python server.py` bhi ho sakta hai. Phir **usi computer** ke browser mein `http://127.0.0.1:4173` kholain. Server band karne par local app aur sync endpoint unavailable ho jayenge. Doosray phone/computer aur sync ke liye securely hosted HTTPS deployment chahiye; plain LAN HTTP ko private customer data ke liye use na karein.

Development ke liye Node 20+:

```bash
npm install
npm run build
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
```

`site/` dobara build hota hai. Vite dev server ke liye pehle `python3 server.py --port 4174`, phir doosray terminal mein `npm run dev`; `/api` local Python server ko proxy hoti hai.

## Zaroori haddain

- Yeh pilot hai: automated sample aur browser tests kiye gaye hain, lekin real darzi ki dukaan ke workflow aur har mobile browser par field testing abhi nahi hui.
- Automatic SMS/WhatsApp sending, staff-level permissions, bank connection, attachments/photos aur live Power BI connection shamil nahi.
- Aap ki local storage, backup aur server ki security aap ke device aur deployment par depend karti hai. Bohat aham data ke liye regular independent backup rakhein.
