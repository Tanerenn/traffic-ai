
<img width="890" height="789" alt="image" src="https://github.com/user-attachments/assets/8bec803e-bf38-46f2-85cc-06a0c021f04d" />


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

csv
date,time,direction,number
2022.05.24,17:00:01,North,2
2022.05.24,17:00:25,South,1

🔗 Veri Kaynağı ve Referanslar

Bu projede kullanılan trafik verileri, gerçek dünya senaryolarını yansıtmak amacıyla Bremen, Almanya'daki bir kavşaktan alınan aşağıdaki akademik veri setinden derlenmiştir:

> 📄 **CN+: Vehicular Dataset at Traffic Light Regulated Intersection in Bremen, Germany**
>
> 👤 *Yazarlar:* Thenuka Karunathilake, Meyo Zongo, Dinithi Amarawardana, Anna Förster
> 🏛️ *Dergi:* Nature Scientific Data
> 📅 *Yayın Tarihi:* 22 Haziran 2024
> 🔗 [Makaleyi İncele](https://www.nature.com/articles/s41597-024-03498-4)

