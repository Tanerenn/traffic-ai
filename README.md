<img width="890" height="790" alt="image" src="https://github.com/user-attachments/assets/79e250b6-8cba-4a5c-bdf7-e0e72a8c57cd" />


💡 Proje Ne Yapıyor?

1.  **Anlık Analiz:** Sistem sürekli olarak kuzey, güney, doğu ve batı şeritlerindeki araç sayısını sayar.
2.  **AI Karar Mekanizması (Q-Learning Mantığı):** Hangi tarafta kuyruk daha uzunsa, sistem önceliği o tarafa verir.
3.  **Agresif Optimizasyon:** Eğer bir tarafta araç yoksa, ışığı hemen kırmızıya çevirip bekleyen diğer tarafa yeşil yakar. Boşuna bekleme olmaz.

## 📂 Veri Odaklı Simülasyon

Sistem rastgele araç üretmek yerine, gerçek dünyadan alınmış verileri kullanır:

* **CSV Entegrasyonu:** `traffic_data.csv` dosyasındaki gerçek tarih/saat verilerini okur.
* **Gerçekçi Akış:** Veri setindeki yoğunluk neyse, ekrana o yansır.

## 🛠️ Kullandığım Teknolojiler

* **JavaScript (Vanilla):** Tüm yapay zeka ve simülasyon mantığını saf JavaScript ile yazdım.
* **HTML5 Canvas:** Araçların ve yolların dinamik çizimi için.
* **Fetch API:** CSV verilerini okumak ve işlemek için.
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
