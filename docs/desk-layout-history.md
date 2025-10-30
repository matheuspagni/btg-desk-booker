# Histórico de Layout das Mesas

Este arquivo mantém o histórico de como as mesas estão organizadas no banco de dados, já que a configuração fica diretamente no banco e não no código.

## 📅 Histórico de Alterações

### 2025-10-30 - Estrutura Final Estabelecida

**Estrutura atual:**
- **Linha 4:** A1-A10 (10 mesas)
- **Linha 3:** B1-B10 (10 mesas)  
- **Linha 2:** Vazia (0 mesas)
- **Linha 1:** C1-C10 (10 mesas)

**Total:** 30 mesas ativas

**Detalhes por linha:**
```
Linha 4 (A): A1, A2, A3, A4, A5, A6, A7, A8, A9, A10
Linha 3 (B): B1, B2, B3, B4, B5, B6, B7, B8, B9, B10
Linha 2:     (vazia)
Linha 1 (C): C1, C2, C3, C4, C5, C6, C7, C8, C9, C10
```

**Ações realizadas:**
1. Restauração de 18 mesas que foram deletadas acidentalmente
2. Movimentação de B1 e B2 da linha 5 para linha 3
3. Organização final conforme especificação do usuário

**Scripts utilizados:**
- `scripts/restore-correct-structure.js` - Restauração completa
- `scripts/move-b1-b2.js` - Movimentação de B1 e B2
- `scripts/manage-desks.js` - Configuração atualizada

---

## 📋 Como Atualizar Este Histórico

Sempre que houver alterações na estrutura das mesas:

1. **Execute o script de gerenciamento:**
   ```bash
   node scripts/manage-desks.js
   ```

2. **Atualize este arquivo** com:
   - Data da alteração
   - Nova estrutura
   - Ações realizadas
   - Scripts utilizados

3. **Faça commit** das alterações:
   ```bash
   git add docs/desk-layout-history.md
   git commit -m "docs: update desk layout - [descrição da alteração]"
   ```

## 🔍 Verificar Estrutura Atual

Para verificar como estão as mesas no banco:

```bash
# Ver todas as mesas
curl -s "http://localhost:3000/api/desks" | jq '[.[] | .code] | sort'

# Ver mesas por linha
curl -s "http://localhost:3000/api/desks" | jq '[.[] | .code] | sort | group_by(.[0:1]) | .[] | {line: .[0][0:1], desks: . | sort}'
```

## 📝 Notas Importantes

- **Sempre mantenha este arquivo atualizado** quando houver mudanças
- **A configuração fica no banco**, não no código
- **Use o script `manage-desks.js`** para fazer alterações
- **Documente todas as alterações** para rastreabilidade
