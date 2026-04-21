CREATE OR REPLACE FUNCTION public.get_lesson_status(_is_published boolean, _title text, _content_type text, _media_url text, _audio_url text, _body_markdown text, _videos jsonb, _text_files_urls jsonb, _pdf_url text, _released_at timestamp with time zone)
 RETURNS lesson_status
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  has_title boolean;
  has_content boolean;
  is_complete boolean;
BEGIN
  has_title := _title IS NOT NULL AND length(trim(_title)) > 0;

  has_content := (
    (_media_url IS NOT NULL AND length(trim(_media_url)) > 0)
    OR (_audio_url IS NOT NULL AND length(trim(_audio_url)) > 0)
    OR (_body_markdown IS NOT NULL AND length(trim(_body_markdown)) > 0)
    OR (_videos IS NOT NULL AND jsonb_array_length(_videos) > 0)
    OR (_text_files_urls IS NOT NULL AND jsonb_array_length(_text_files_urls) > 0)
    OR (_pdf_url IS NOT NULL AND length(trim(_pdf_url)) > 0)
  );

  -- A data de publicação NÃO é mais obrigatória para liberar a publicação.
  is_complete := has_title AND has_content;

  IF _is_published AND is_complete THEN
    RETURN 'publicada'::public.lesson_status;
  ELSIF _is_published AND NOT is_complete THEN
    RETURN 'incompleta'::public.lesson_status;
  ELSE
    RETURN 'rascunho'::public.lesson_status;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_lesson_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  status public.lesson_status;
BEGIN
  IF NEW.is_published = true THEN
    status := public.get_lesson_status(
      NEW.is_published, NEW.title, NEW.content_type,
      NEW.media_url, NEW.audio_url, NEW.body_markdown,
      NEW.videos, NEW.text_files_urls, NEW.pdf_url, NEW.released_at
    );
    IF status = 'incompleta' THEN
      RAISE EXCEPTION 'Não é possível publicar aula incompleta. Preencha título e ao menos um conteúdo (vídeo, texto, áudio ou PDF).'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;