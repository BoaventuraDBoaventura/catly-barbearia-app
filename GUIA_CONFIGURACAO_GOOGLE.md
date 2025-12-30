# Guia de Configuração do Login Google (Usando seu projeto Barberias)

Obrigado por fornecer os dados do projeto **Barberias** (ID: `barberias-a897d`).

Para conectar este projeto ao sistema de login do aplicativo (que usa Supabase), você precisa obter duas chaves secretas: **Client ID** e **Client Secret**.

## Siga estes passos:

1.  **Acesse o Google Cloud Console:**
    *   Vá para: [https://console.cloud.google.com/](https://console.cloud.google.com/)
    *   No topo, certifique-se de que o projeto selecionado é **Barberias** (`barberias-a897d`).

2.  **Configure a Tela de Consentimento (Se ainda não fez):**
    *   No menu lateral, vá em **APIs e Serviços** > **Tela de permissão OAuth**.
    *   Selecione **Externo** e clique em **Criar**.
    *   Preencha:
        *   **Nome do App:** Barberias
        *   **Email para suporte:** Seu email
        *   **Email do desenvolvedor:** Seu email
    *   Clique em "Salvar e Continuar" até finalizar.

3.  **Crie as Credenciais:**
    *   No menu lateral, vá em **APIs e Serviços** > **Credenciais**.
    *   Clique em **+ CRIAR CREDENCIAIS** (no topo) > **ID do cliente OAuth**.
    *   **Tipo de aplicativo:** Aplicação Web.
    *   **Nome:** Barberias Web.
    *   **Origens JavaScript autorizadas:**
        *   Adicione: `http://localhost:5173` (para testes locais)
        *   Adicione: `https://<seu-projeto>.supabase.co` (URL do seu Supabase, veja abaixo)
    *   **URIs de redirecionamento autorizados:**
        *   Você precisa pegar essa URL no painel do Supabase (Authentication > Providers > Google > Callback URL).
        *   Geralmente é algo como: `https://vwngqedyjobjdvylkavj.supabase.co/auth/v1/callback`
    *   Clique em **CRIAR**.

4.  **Copie e Cole no Supabase:**
    *   Uma janela aparecerá com "Seu ID de cliente" e "Sua chave secreta de cliente".
    *   Copie esses dois códigos.
    *   Vá no seu painel do Supabase ([supabase.com](https://supabase.com)).
    *   Entre em **Authentication** > **Providers** > **Google**.
    *   Cole o **Client ID** e o **Client Secret**.
    *   Ative a opção **Enable Google Sign in**.
    *   Clique em **Save**.

Pronto! Agora o botão "Continuar com Google" funcionará perfeitamente.
