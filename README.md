<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Catly - Barbearia App 💈

Aplicação moderna para agendamento de serviços de barbearia com IA integrada.

## 🎉 Status: 100% FUNCIONAL ✅

Todas as funcionalidades foram testadas e estão operacionais!

## 🚀 Início Rápido

### 1. Acesse a aplicação
```
http://localhost:3001
```

O servidor já está rodando! Basta abrir o link acima no navegador.

### 2. Permita a localização
Quando solicitado, clique em "Permitir" para identificar sua localização automaticamente.

### 3. Explore!
- Navegue pelas barbearias próximas
- Clique em serviços para receber dicas da IA
- Faça agendamentos completos

## 📚 Documentação

- **[GUIA_TESTE.md](./GUIA_TESTE.md)** - Instruções detalhadas de teste
- **[RESUMO_CORRECOES.md](./RESUMO_CORRECOES.md)** - Todas as correções aplicadas
- **[CHECKLIST.md](./CHECKLIST.md)** - Checklist completo de funcionalidades

## ✨ Funcionalidades

- 🤖 **Dicas de estilo com IA** - Recomendações personalizadas usando Gemini AI
- 📍 **Geolocalização inteligente** - Identifica sua localização automaticamente
- 📅 **Agendamento completo** - Fluxo de reserva em múltiplas etapas
- ⭐ **Sistema de favoritos** - Salve suas barbearias preferidas
- 🗺️ **Exploração por mapa** - Encontre barbearias próximas
- 🎨 **Design premium** - Interface moderna com animações suaves

## 🔧 Correções Aplicadas

### ✅ API Gemini
- Modelo atualizado para `gemini-2.0-flash-exp`
- Configurações deprecated removidas
- API key configurada em `.env.local`

### ✅ Geolocalização
- Prompt otimizado para Moçambique
- Fallback robusto para OpenStreetMap
- Links para Google Maps sempre disponíveis

### ✅ Interface
- Arquivo CSS completo criado
- Animações e transições suaves
- Scrollbar personalizada
- Tema dark premium

## 🛠️ Tecnologias

- React 19 + TypeScript
- Vite 6 (HMR ativo)
- TailwindCSS
- React Router DOM
- Google Gemini AI
- OpenStreetMap (fallback gratuito)

## 📱 Como Usar

1. **Permitir localização** quando solicitado
2. **Navegar** pelas barbearias próximas
3. **Clicar em serviços** para receber dicas da IA
4. **Selecionar** serviços e profissionais
5. **Agendar** seu horário preferido
6. **Gerenciar** agendamentos no perfil

## 🔐 Configuração (Já Feita!)

A API key do Gemini já está configurada em `.env.local`:
```env
VITE_GEMINI_API_KEY=AIzaSyADXigDEXRwkz1-mIVeFwtBa3pLdkDXhnU
```

## 🧪 Testes

Consulte o **[GUIA_TESTE.md](./GUIA_TESTE.md)** para instruções detalhadas de teste.

### Teste Rápido
1. Abra http://localhost:3001
2. Permita localização
3. Clique em uma barbearia
4. Clique em um serviço (receberá dica da IA)
5. Clique em "Reservar" e complete o fluxo

## 📊 Performance

- ⚡ Vite 6 - Build ultra-rápido
- 🔥 HMR ativo - Atualizações instantâneas
- 📦 Bundle otimizado
- 🎯 Lazy loading de imagens

## 🌐 Acesso

- **Local**: http://localhost:3001
- **Rede**: http://192.168.10.37:3001

---

**Desenvolvido com ❤️ para facilitar seu agendamento de barbearia**

**Status**: 🟢 Totalmente funcional e pronto para uso!
