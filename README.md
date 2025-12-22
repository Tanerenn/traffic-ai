<img width="890" height="790" alt="image" src="https://github.com/user-attachments/assets/79e250b6-8cba-4a5c-bdf7-e0e72a8c57cd" />


💡 Proje Ne Yapıyor?

1.  **Gerçek Veri Okuma:** `traffic_data.csv` dosyasındaki tarih, saat ve yön verilerini okuyor. Araçlar bu saatlere tam uyacak şekilde yola çıkıyor.
2.  **Akıllı Işık Yönetimi:** Klasik (süreye bağlı) trafik ışıkları yerine, kavşaktaki kuyruğa bakan bir sistem var. Hangi tarafta daha çok araç bekliyorsa o tarafa yeşil yakıyor.
3.  **Çarpışma Önleme:** Araçlar kavşak ortası doluysa, yeşil yansa bile ilerlemiyor ("Waiting Clearance" durumu).
4.  **Canvas Çizimi:** Tüm araçlar ve yollar HTML5 Canvas kullanılarak dinamik olarak çizdiriliyor.

## 🛠️ Kullandığım Teknolojiler

* **HTML5 & CSS3:** Sayfa düzeni ve stil işlemleri için.
* **JavaScript (Vanilla):** Herhangi bir kütüphane kullanmadan tüm mantığı saf JS ile yazdım.
* **HTML5 Canvas:** Animasyon ve çizimler için.

## 🚀 Nasıl Çalıştırırsınız?

Bu proje dışarıdan bir veri dosyası (`.csv`) okuduğu için tarayıcı güvenlik kuralları gereği direkt çift tıklayarak açıldığında çalışmayabilir.

Yerel bir sunucuda açmanız gerekiyor. En kolayı:

1.  Projeyi **VS Code** ile açın.
2.  `index.html` dosyasına sağ tıklayıp **"Open with Live Server"** deyin.
3.  Hepsi bu kadar!

## 📊 Veri Formatı

Eğer kendi verinizi denemek isterseniz `traffic_data.csv` dosyasını şu formatta düzenleyebilirsiniz:

```csv
date,time,direction,number
2022.05.24,17:00:01,North,2
2022.05.24,17:00:25,South,1
