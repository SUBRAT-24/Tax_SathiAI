# 📦 HSN/SAC Master Data Guide

This directory holds the master dataset for HSN (Harmonized System of Nomenclature for Goods) and SAC (Services Accounting Code) for TaxSathi AI.

## Official Sources
1. **CBIC Official HSN Rate Schedule**:
   - URL: `https://cbic-gst.gov.in/gst-goods-services-rates.html`
2. **GST Portal Search HSN/SAC**:
   - URL: `https://services.gst.gov.in/services/searchhsnsac`
3. **CBIC Tariff Notifications**:
   - Goods: Notification No. 1/2017-Central Tax (Rate) as amended
   - Exemption Goods: Notification No. 2/2017-Central Tax (Rate) as amended
   - Services: Notification No. 11/2017-Central Tax (Rate) as amended
   - Exemption Services: Notification No. 12/2017-Central Tax (Rate) as amended
   - Compensation Cess: Notification No. 1/2017-Compensation Cess (Rate) as amended
   - 56th GST Council Meeting Recommendations (effective 22 Sep 2025)

## Downloading Full 12,000+ Codes Master Table
To update or download the complete master table:
1. Download the Excel / CSV dump from the CBIC portal:
   `https://cbic-gst.gov.in/pdf/GST-Rates-Commodity-Services.xlsx`
2. Convert the table into the JSON format:
   ```json
   [
     {
       "hsn_code": "0101",
       "description": "Live horses, asses, mules and hinnies",
       "chapter": "01",
       "gst_rate": 0,
       "cess_rate": 0,
       "effective_from": "2017-07-01",
       "effective_to": null,
       "notification": "Notification No. 2/2017-Central Tax (Rate)"
     }
   ]
   ```
3. Save to `backend/app/services/data/hsn_sac_master.json` or set `HSN_DATA_PATH` in `.env`.
