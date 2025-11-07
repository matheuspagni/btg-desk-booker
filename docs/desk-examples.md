# Exemplos de Gerenciamento de Mesas

Este documento contém exemplos práticos de como usar o script `manage-desks.js` para diferentes cenários.

## 📋 Exemplo 1: Adicionar Mesas da Linha B

### 1. Editar o Script

Abra `scripts/manage-desks.js` e adicione as mesas da linha B:

```javascript
const DESK_CONFIG = [
  // Mesas existentes da linha A
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  { code: 'A3', row: 4, col: 3 },
  { code: 'A4', row: 4, col: 4 },
  { code: 'A5', row: 4, col: 5 },
  { code: 'A6', row: 4, col: 6 },
  { code: 'A7', row: 4, col: 7 },
  { code: 'A8', row: 4, col: 8 },
  { code: 'A9', row: 4, col: 9 },
  { code: 'A10', row: 4, col: 10 },
  
  // Novas mesas da linha B
  { code: 'B1', row: 5, col: 1 },
  { code: 'B2', row: 5, col: 2 },
  { code: 'B3', row: 5, col: 3 },
  { code: 'B4', row: 5, col: 4 },
  { code: 'B5', row: 5, col: 5 },
  { code: 'B6', row: 5, col: 6 },
  { code: 'B7', row: 5, col: 7 },
  { code: 'B8', row: 5, col: 8 },
  { code: 'B9', row: 5, col: 9 },
  { code: 'B10', row: 5, col: 10 },
];
```

### 2. Executar o Script

```bash
node scripts/manage-desks.js
```

### 3. Resultado Esperado

```
🚀 Gerenciando mesas...
📋 Configuração atual: 20 mesas definidas
✅ Mesa A1 já existe
✅ Mesa A2 já existe
...
📝 Criando 10 mesas: B1, B2, B3, B4, B5, B6, B7, B8, B9, B10
✅ Mesas criadas com sucesso!
📊 Total de mesas ativas no sistema: 20
```

## 📋 Exemplo 2: Adicionar Mesas da Linha C (Parcial)

### 1. Editar o Script

```javascript
const DESK_CONFIG = [
  // Mesas existentes...
  
  // Mesas da linha C (apenas algumas)
  { code: 'C1', row: 6, col: 1 },
  { code: 'C2', row: 6, col: 2 },
  { code: 'C3', row: 6, col: 3 },
  { code: 'C5', row: 6, col: 5 },  // Pular C4
  { code: 'C6', row: 6, col: 6 },
];
```

## 📋 Exemplo 3: Remover uma Mesa

### 1. Editar o Script

Para remover a mesa A5, simplesmente remova sua linha:

```javascript
const DESK_CONFIG = [
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  { code: 'A3', row: 4, col: 3 },
  { code: 'A4', row: 4, col: 4 },
  // { code: 'A5', row: 4, col: 5 },  // REMOVIDA
  { code: 'A6', row: 4, col: 6 },
  // ... resto das mesas
];
```

### 2. Executar o Script

```bash
node scripts/manage-desks.js
```

### 3. Resultado Esperado

```
🗑️  Deletando 1 mesas: A5
✅ Mesas deletadas com sucesso!
```

## 📋 Exemplo 4: Verificar Mesas em uma Linha

Antes de adicionar novas mesas, confira o layout existente:

```bash
# Ver mesas da linha C
curl -s "http://localhost:3000/api/desks" | jq '[.[] | select(.code | startswith("C"))] | sort_by(.code)'

# Ver mesas da linha B
curl -s "http://localhost:3000/api/desks" | jq '[.[] | select(.code | startswith("B"))] | sort_by(.code)'
```

## 📋 Exemplo 5: Layout Completo (A, B, C)

```javascript
const DESK_CONFIG = [
  // Linha A (4)
  { code: 'A1', row: 4, col: 1 },
  { code: 'A2', row: 4, col: 2 },
  { code: 'A3', row: 4, col: 3 },
  { code: 'A4', row: 4, col: 4 },
  { code: 'A5', row: 4, col: 5 },
  { code: 'A6', row: 4, col: 6 },
  { code: 'A7', row: 4, col: 7 },
  { code: 'A8', row: 4, col: 8 },
  { code: 'A9', row: 4, col: 9 },
  { code: 'A10', row: 4, col: 10 },
  
  // Linha B (5)
  { code: 'B1', row: 5, col: 1 },
  { code: 'B2', row: 5, col: 2 },
  { code: 'B3', row: 5, col: 3 },
  { code: 'B4', row: 5, col: 4 },
  { code: 'B5', row: 5, col: 5 },
  { code: 'B6', row: 5, col: 6 },
  { code: 'B7', row: 5, col: 7 },
  { code: 'B8', row: 5, col: 8 },
  { code: 'B9', row: 5, col: 9 },
  { code: 'B10', row: 5, col: 10 },
  
  // Linha C (6)
  { code: 'C1', row: 6, col: 1 },
  { code: 'C2', row: 6, col: 2 },
  { code: 'C3', row: 6, col: 3 },
  { code: 'C4', row: 6, col: 4 },
  { code: 'C5', row: 6, col: 5 },
  { code: 'C6', row: 6, col: 6 },
  { code: 'C7', row: 6, col: 7 },
  { code: 'C8', row: 6, col: 8 },
  { code: 'C9', row: 6, col: 9 },
  { code: 'C10', row: 6, col: 10 },
];
```

## ⚠️ Dicas Importantes

1. **Sempre mantenha as mesas existentes** no array
2. **Verifique as mesas existentes** antes de adicionar novas entradas no layout
3. **Execute o script** após cada alteração
4. **Faça backup** antes de grandes mudanças
5. **Teste em desenvolvimento** antes de aplicar em produção
