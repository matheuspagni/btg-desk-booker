# Gerenciamento de Mesas

Este documento explica como adicionar, remover e modificar mesas no sistema usando o script `manage-desks.js`.

## 📁 Localização do Script

```
scripts/manage-desks.js
```

## 📋 Histórico de Layout

Como a configuração das mesas fica no banco de dados, mantenemos um histórico no Git:

- **Histórico completo:** [docs/desk-layout-history.md](docs/desk-layout-history.md)
- **Ver status atual:** `node scripts/desk-status.js`

## 🚀 Como Usar

### 1. Executar o Script

```bash
node scripts/manage-desks.js
```

### 2. Editar Configuração

Abra o arquivo `scripts/manage-desks.js` e edite a seção `DESK_CONFIG`:

```javascript
const DESK_CONFIG = [
  // Formato: { code: 'A1', row: 4, col: 1 }
  // Exemplo: Mesas da linha A (já existentes)
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  // ... outras mesas
  
  // Adicione novas mesas aqui:
  { code: 'B1', row: 5, col: 1 },
  { code: 'B2', row: 5, col: 2 },
  { code: 'C1', row: 6, col: 1 },
];
```

## 📋 Parâmetros

- **`code`**: Código da mesa (ex: 'A1', 'B2', 'C10')
- **`row`**: Número da linha (row_number no banco)
- **`col`**: Número da coluna (col_number no banco)

## 🎯 Exemplos de Uso

### Adicionar Mesas da Linha B

```javascript
const DESK_CONFIG = [
  // Mesas existentes da linha A
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  // ... A3 até A10
  
  // Novas mesas da linha B
  { code: 'B1', row: 5, col: 1 },
  { code: 'B2', row: 5, col: 2 },
  { code: 'B3', row: 5, col: 3 },
  { code: 'B4', row: 5, col: 4 },
  { code: 'B5', row: 5, col: 5 },
];
```

### Adicionar Mesas da Linha C

```javascript
const DESK_CONFIG = [
  // Mesas existentes...
  
  // Novas mesas da linha C
  { code: 'C1', row: 6, col: 1 },
  { code: 'C2', row: 6, col: 2 },
  { code: 'C3', row: 6, col: 3 },
];
```

### Remover uma Mesa

Para remover uma mesa, simplesmente remova sua entrada do array `DESK_CONFIG`:

```javascript
// Antes (mesa A5 existe)
{ code: 'A5', row: 4, col: 5 },

// Depois (mesa A5 será removida)
// (linha removida)
```

## 📋 Atualizar Histórico

Sempre que houver alterações na estrutura das mesas:

1. **Execute o script de gerenciamento:**
   ```bash
   node scripts/manage-desks.js
   ```

2. **Verifique o status atual:**
   ```bash
   node scripts/desk-status.js
   ```

3. **Atualize o histórico:**
   - Edite `docs/desk-layout-history.md`
   - Adicione nova entrada com data, estrutura e ações
   - Faça commit das alterações

4. **Exemplo de commit:**
   ```bash
   git add docs/desk-layout-history.md
   git commit -m "docs: update desk layout - added D1-D5 to row 5"
   ```

## ⚠️ Importante

1. **Sempre mantenha as mesas existentes** no array `DESK_CONFIG`
2. **Verifique se o slot existe** na linha/coluna especificada
3. **Execute o script** após fazer alterações
4. **Atualize o histórico** após cada alteração
5. **Faça backup** antes de grandes alterações

## 🔍 Verificar Slots Disponíveis

Para ver quais slots estão disponíveis em uma linha específica:

```bash
curl -s "http://localhost:3000/api/slots" | jq '[.[] | select(.row_number == 5)] | sort_by(.col_number)'
```

## 📊 Status Atual

O script mostra:
- ✅ Mesas que já existem
- 📝 Mesas que serão criadas
- 🗑️ Mesas que serão removidas
- 📊 Total de mesas ativas no sistema

## 🛠️ Troubleshooting

### Erro: "Slot não encontrado"
- Verifique se a linha/coluna existe
- Use o comando curl acima para listar slots disponíveis

### Erro: "Variáveis de ambiente não encontradas"
- Certifique-se de que o arquivo `.env.local` existe
- Verifique se contém `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Erro: "null value in column"
- Verifique se o slot tem `area_id` válido
- O script busca automaticamente o `area_id` do slot
