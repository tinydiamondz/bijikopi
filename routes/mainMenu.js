<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payment - Biji Kopi</title>
    <link rel="stylesheet" href="/css/payment.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
<div class="container">
    <h2>Konfirmasi Pembayaran</h2>

    <form method="POST" action="/confirm">
        <table>
            <thead>
                <tr>
                    <th>Nama Item</th>
                    <th>Qty</th>
                    <th>Harga Satuan</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                <% let originalTotal = 0; %>
                
                <% items.forEach(item => { %>
                    <% 
                       let subtotal = item.total_cart; 
                       originalTotal += subtotal; 
                    %>
                    <tr>
                        <td><%= item.name_cart %></td>
                        <td><%= item.qty_cart %></td>
                        <td>Rp <%= (item.total_cart / item.qty_cart).toLocaleString('id-ID') %></td>
                        <td>Rp <%= subtotal.toLocaleString('id-ID') %></td>
                    </tr>
                    
                    <input type="hidden" name="selected[]" value="<%= item.id_cart %>">
                <% }) %>
            </tbody>
        </table>

        <div class="summary-box" style="margin-top: 20px; text-align: right; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            
            <div class="row">
                <span style="color: #666;">Subtotal:</span>
                <strong>Rp <%= originalTotal.toLocaleString('id-ID') %></strong>
            </div>

            <% if (transaction.discount_amount && transaction.discount_amount > 0) { %>
                <div class="row" style="color: green; margin: 5px 0;">
                    <span>Potongan Voucher Sabtu (20%):</span>
                    <strong>- Rp <%= transaction.discount_amount.toLocaleString('id-ID') %></strong>
                </div>
                <hr style="margin: 10px 0; opacity: 0.3;">
            <% } %>

            <div class="row total" style="font-size: 1.5rem; margin-top: 10px; color: #333;">
                <strong>Total Pembayaran:</strong> 
                <span style="color: #d4a373;">Rp <%= transaction.total_transaction.toLocaleString('id-ID') %></span>
            </div>

        </div>

        <div class="payment-method" style="margin-top: 20px;">
            <label for="payment_method"><strong>Pilih Metode Pembayaran:</strong></label>
            <select name="payment_method" id="payment_method" required style="padding: 10px; width: 100%; margin-top: 5px;">
                <option value="">-- Pilih Metode --</option>
                <option value="Cash">Cash</option>
                <option value="Debit">Debit</option>
                <option value="E-Wallet">E-Wallet</option>
            </select>
        </div>

        <div class="button-group" style="margin-top: 30px; display: flex; justify-content: space-between;">
            <a href="/cart" class="btn-back" style="padding: 10px 20px; text-decoration: none; color: #333; border: 1px solid #ccc; border-radius: 5px;">Kembali</a>
            <button type="submit" class="btn-pay" style="padding: 10px 30px; background-color: #d4a373; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Bayar Sekarang</button>
        </div>
    </form>
    
</div>
</body>
</html>
