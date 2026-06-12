<?php

namespace App\Controller;

use App\Entity\BlogPost;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class BlogController extends AbstractController
{
    #[Route("/blog", name: "blog_index", methods: ["GET"])]
    public function index(EntityManagerInterface $em): Response
    {
        $posts = $em->getRepository(BlogPost::class)->findBy([], ["publishedAt" => "DESC"]);

        return $this->render("blog/index.html.twig", [
            "posts" => $posts,
        ]);
    }

    #[Route("/blog/{slug}", name: "blog_post_show", methods: ["GET"])]
    public function show(string $slug, EntityManagerInterface $em): Response
    {
        $post = $em->getRepository(BlogPost::class)->findOneBy(["slug" => $slug]);

        if (!$post) {
            throw $this->createNotFoundException("Post not found");
        }

        return $this->render("blog/show.html.twig", [
            "post" => $post,
        ]);
    }

    #[Route("/sitemap-blog.xml", name: "blog_sitemap", methods: ["GET"], format: "xml")]
    public function sitemap(EntityManagerInterface $em): Response
    {
        $posts = $em->getRepository(BlogPost::class)->findBy([], ["publishedAt" => "DESC"]);

        $response = new Response($this->renderView("blog/sitemap.xml.twig", [
            "posts" => $posts,
        ]));
        $response->headers->set("Content-Type", "text/xml");

        return $response;
    }
}
